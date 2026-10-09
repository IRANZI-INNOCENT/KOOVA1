from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.businesses.models import Business
from apps.kova_ai.services.openrouter import OpenRouterError

from .models import Content, ContentBatch
from .serializers import ContentBatchSerializer, ContentSerializer
from .services.campaign import draft_campaign, get_connected_channels
from .services.draft import draft_post


class ContentListView(APIView):
    """List and create content for a business."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        contents = Content.objects.filter(business=business)

        platform = request.query_params.get("platform")
        if platform:
            contents = contents.filter(platform=platform)

        content_status = request.query_params.get("status")
        if content_status:
            contents = contents.filter(status=content_status)

        return Response(ContentSerializer(contents, many=True).data)

    def post(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        data = request.data.copy()
        product_id = data.get("product")
        if product_id:
            from apps.commerce.models import Product

            if not Product.objects.filter(
                business=business, id=product_id,
            ).exists():
                return Response(
                    {"detail": "That product is not in this business."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        serializer = ContentSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(business=business, created_by_ai=False)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ContentDetailView(APIView):
    """Retrieve, update, or delete a content asset."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, pk):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        content = get_object_or_404(Content, pk=pk, business=business)
        return Response(ContentSerializer(content).data)

    def patch(self, request, business_id, pk):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        content = get_object_or_404(Content, pk=pk, business=business)
        serializer = ContentSerializer(content, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, business_id, pk):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        content = get_object_or_404(Content, pk=pk, business=business)
        content.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ContentDraftView(APIView):
    """Draft a caption from the business brain. The owner saves it."""

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        product_id = request.data.get("product_id")
        if product_id in ("", None):
            product_id = None
        else:
            try:
                product_id = int(product_id)
            except (TypeError, ValueError):
                return Response({"detail": "Choose a product from this business."}, status=400)
        try:
            draft = draft_post(
                business,
                platform=request.data.get("platform") or "",
                content_type=request.data.get("content_type") or "",
                note=request.data.get("note") or "",
                product_id=product_id,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        except OpenRouterError as exc:
            return Response({"detail": str(exc)}, status=502)
        return Response(draft)


class ContentPublishView(APIView):
    """Send the post to the connected account, or schedule it."""

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, pk):
        from apps.social.services.publish import PublishError, enqueue, parse_when

        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        content = get_object_or_404(Content, pk=pk, business=business)
        try:
            when = parse_when(request.data.get("scheduled_at"))
            enqueue(content, when)
        except PublishError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        content.refresh_from_db()
        return Response(ContentSerializer(content).data)


class ContentApproveView(APIView):
    """Approve a draft content asset for publishing."""

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, pk):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        content = get_object_or_404(Content, pk=pk, business=business)

        if content.status != Content.Status.DRAFT:
            return Response(
                {"error": "Only draft content can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content.status = Content.Status.APPROVED
        content.save(update_fields=["status", "updated_at"])
        return Response(ContentSerializer(content).data)


class ContentRejectView(APIView):
    """Reject a content asset."""

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, pk):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        content = get_object_or_404(Content, pk=pk, business=business)

        if content.status == Content.Status.PUBLISHED:
            return Response(
                {"error": "Published content cannot be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content.status = Content.Status.REJECTED
        content.save(update_fields=["status", "updated_at"])
        return Response(ContentSerializer(content).data)


class ContentCampaignView(APIView):
    """
    Generate adapted content for every connected channel simultaneously.

    Kova acts as a social media manager: one brief produces content
    for Instagram post + carousel + reel + story, Facebook post +
    carousel, etc., all adapted to each platform.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user,
        )
        product_id = request.data.get("product_id")
        if product_id in ("", None):
            product_id = None
        else:
            try:
                product_id = int(product_id)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "Choose a product from this business."},
                    status=400,
                )
        try:
            result = draft_campaign(
                business,
                note=request.data.get("note") or "",
                product_id=product_id,
                platform=request.data.get("platform") or "all",
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        except OpenRouterError as exc:
            return Response({"detail": str(exc)}, status=502)
        return Response(result)


class ContentScheduleView(APIView):
    """Ask Kova when to publish a set of drafted posts."""

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id):
        from apps.social.services.publish import PublishError

        from .services.schedule import schedule_posts

        business = get_object_or_404(
            Business, id=business_id, owner=request.user,
        )
        raw_ids = request.data.get("content_ids") or []
        if not isinstance(raw_ids, list) or not raw_ids:
            return Response({"detail": "Choose the posts Kova should schedule."}, status=400)
        try:
            content_ids = [int(item) for item in raw_ids]
        except (TypeError, ValueError):
            return Response({"detail": "Choose the posts Kova should schedule."}, status=400)
        try:
            plan = schedule_posts(business, content_ids)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        except (OpenRouterError, PublishError) as exc:
            return Response({"detail": str(exc)}, status=502)
        return Response({"scheduled": plan})


class ContentBatchListView(APIView):
    """List content batches for a business, newest first."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user,
        )
        batches = (
            ContentBatch.objects
            .filter(business=business)
            .prefetch_related("contents", "contents__product")
            .order_by("-created_at")[:20]
        )
        return Response(ContentBatchSerializer(batches, many=True).data)


class ConnectedChannelsView(APIView):
    """Return which channels are connected, so the studio knows what to offer."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user,
        )
        accounts = get_connected_channels(business)
        return Response({
            "connected": len(accounts) > 0,
            "accounts": [
                {
                    "id": a.id,
                    "platform": a.platform,
                    "name": a.account_name or a.account_username,
                }
                for a in accounts
            ],
        })


class ProductContentStatusView(APIView):
    """Show which products already have drafted or scheduled posts."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        from apps.social.models import SocialPost

        business = get_object_or_404(Business, id=business_id, owner=request.user)
        rows: dict[int, dict] = {}

        def row_for(product_id: int) -> dict:
            return rows.setdefault(
                product_id,
                {
                    "product_id": product_id,
                    "generated": 0,
                    "scheduled": 0,
                    "published": 0,
                    "next_at": None,
                },
            )

        for content in Content.objects.filter(business=business, product__isnull=False):
            row = row_for(content.product_id)
            row["generated"] += 1
            if content.status == Content.Status.PUBLISHED:
                row["published"] += 1

        posts = SocialPost.objects.filter(
            content__business=business,
            content__product__isnull=False,
            publishing_status=SocialPost.PublishingStatus.SCHEDULED,
        ).select_related("content")
        for post in posts:
            row = row_for(post.content.product_id)
            row["scheduled"] += 1
            when = post.scheduled_at
            if when is not None and (row["next_at"] is None or when < row["next_at"]):
                row["next_at"] = when

        payload = []
        for row in rows.values():
            if row["next_at"] is not None:
                row["next_at"] = row["next_at"].isoformat()
            payload.append(row)
        return Response(payload)
