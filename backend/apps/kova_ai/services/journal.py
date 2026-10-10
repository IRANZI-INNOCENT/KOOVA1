import logging

from apps.kova_ai.models import KovaExchange

logger = logging.getLogger(__name__)


def remember_exchange(
    *,
    business,
    user,
    task,
    request_text,
    response_text="",
    model_name="",
    status,
    error="",
    tool_calls=None,
):
    """Store one Ask Kova turn. A storage failure must not hide the reply."""

    try:
        KovaExchange.objects.create(
            business=business,
            user=user,
            task=str(task or ""),
            request_text=request_text or "",
            response_text=response_text or "",
            model_name=model_name or "",
            status=status,
            error=error or "",
            tool_calls=list(tool_calls or []),
        )
    except Exception:
        logger.exception(
            "Kova could not store this exchange.",
            extra={"business_id": getattr(business, "id", None)},
        )


def tool_call_record(tool_call):
    result = tool_call.result if isinstance(tool_call.result, dict) else {}
    arguments = tool_call.arguments if isinstance(tool_call.arguments, dict) else {}
    return {
        "tool_name": tool_call.tool_name,
        "arguments": arguments,
        "status": result.get("status"),
        "result": result,
    }
