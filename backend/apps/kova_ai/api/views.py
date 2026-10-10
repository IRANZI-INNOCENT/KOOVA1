"""
HTTP API for Kova's AI Agent.

This module is the application boundary between authenticated clients
and the Kova Agent.

The API:
    - authenticates the user;
    - verifies business ownership;
    - builds authoritative business context;
    - invokes Kova's Agent;
    - returns the final response.

It does not contain AI reasoning logic.
"""

import logging
from dataclasses import replace

from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.businesses.models import Business
from apps.kova_ai.agents.agent import (
    KovaAgent,
    KovaAgentError,
)
from apps.kova_ai.context.engine import ContextEngine
from apps.kova_ai.context.types import ContextTask
from apps.kova_ai.models import KovaExchange
from apps.kova_ai.services.journal import remember_exchange, tool_call_record
from apps.kova_ai.services.openrouter import OpenRouterError

from .serializers import (
    KovaAgentRequestSerializer,
    KovaAgentResponseSerializer,
)


logger = logging.getLogger(__name__)


class KovaAgentView(APIView):
    """
    Execute a request through Kova's AI Agent.

    This endpoint is intentionally business-scoped.

    A user can only invoke Kova against a business they own.
    """

    permission_classes = [IsAuthenticated]

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "kova_agent"

    def post(self, request):
        """Process an authenticated Kova request."""

        serializer = KovaAgentRequestSerializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        business = get_object_or_404(
            Business,
            id=serializer.validated_data["business_id"],
            owner=request.user,
        )

        task = ContextTask(
            serializer.validated_data["task"],
        )

        message = serializer.validated_data["message"]

        def keep(status_value, *, response_text="", model_name="", error="", calls=None):
            remember_exchange(
                business=business,
                user=request.user,
                task=task.value,
                request_text=message,
                response_text=response_text,
                model_name=model_name,
                status=status_value,
                error=error,
                tool_calls=calls,
            )

        try:
            context = ContextEngine().build(
                business_id=business.id,
                task=task,
            )
            from apps.social.services.autopilot import results_brief

            context = replace(
                context,
                task_context={
                    **(context.task_context or {}),
                    "results": results_brief(business),
                },
            )

            result = KovaAgent().run(
                context=context,
                user_request=message,
            )

        except OpenRouterError:
            logger.exception(
                "Kova model provider failure.",
                extra={
                    "business_id": business.id,
                    "user_id": request.user.id,
                },
            )

            keep(KovaExchange.Status.FAILED, error="The model provider failed.")
            return Response(
                {
                    "detail": (
                        "Kova is temporarily unable to process "
                        "this request."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except KovaAgentError:
            logger.exception(
                "Kova agent execution failure.",
                extra={
                    "business_id": business.id,
                    "user_id": request.user.id,
                },
            )

            keep(KovaExchange.Status.FAILED, error="Kova could not complete this request.")
            return Response(
                {
                    "detail": (
                        "Kova could not complete this request."
                    ),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError as exc:
            logger.warning(
                "Invalid Kova request.",
                extra={
                    "business_id": business.id,
                    "user_id": request.user.id,
                },
            )

            keep(KovaExchange.Status.FAILED, error=str(exc))
            return Response(
                {
                    "detail": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            logger.exception(
                "Unexpected Kova Agent API failure.",
                extra={
                    "business_id": business.id,
                    "user_id": request.user.id,
                },
            )

            keep(KovaExchange.Status.FAILED, error="Kova encountered an unexpected error.")
            return Response(
                {
                    "detail": (
                        "Kova encountered an unexpected error."
                    ),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        calls = [tool_call_record(tool_call) for tool_call in result.tool_calls]
        keep(
            KovaExchange.Status.COMPLETED,
            response_text=result.message,
            model_name=result.model or "",
            calls=calls,
        )

        response_data = {
            "message": result.message,
            "model": result.model,
            "tool_calls": [
                {
                    "tool_name": call["tool_name"],
                    "status": call["status"],
                }
                for call in calls
            ],
        }

        response_serializer = KovaAgentResponseSerializer(
            data=response_data,
        )

        response_serializer.is_valid(
            raise_exception=True,
        )

        return Response(
            response_serializer.validated_data,
            status=status.HTTP_200_OK,
        )


class KovaExchangeListView(APIView):
    """Recent Ask Kova turns for this business, oldest first."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        business = get_object_or_404(
            Business,
            id=request.query_params.get("business_id"),
            owner=request.user,
        )
        rows = list(
            business.kova_exchanges.filter(status=KovaExchange.Status.COMPLETED)
            .order_by("-created_at")[:12]
        )
        rows.reverse()
        return Response({
            "turns": [
                {
                    "id": row.id,
                    "request": row.request_text,
                    "response": row.response_text,
                    "created_at": row.created_at.isoformat(),
                }
                for row in rows
            ],
        })


class KovaStartersView(APIView):
    """Questions based on the shop and a market search."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        business = get_object_or_404(
            Business,
            id=request.query_params.get("business_id"),
            owner=request.user,
        )
        from apps.kova_ai.services.starters import starter_prompts

        return Response({"prompts": starter_prompts(business)})