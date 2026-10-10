from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.brief.models import MorningBrief
from apps.business_brain.models import BusinessPolicy
from apps.businesses.dossier import build_dossier
from apps.businesses.models import Business
from apps.commerce.models import CommercePage, Order, Product
from apps.content.models import Content
from apps.kova_ai.models import KovaExchange
from apps.leads.models import Lead
from apps.social.models import SocialMessage


class BusinessDossierTests(TestCase):
    def test_the_business_file_includes_the_work_kova_has_done(self):
        owner = get_user_model().objects.create_user(
            email="owner@kova.test",
            password="StrongPassword123!",
            first_name="Amina",
            last_name="Otieno",
        )
        business = Business.objects.create(
            owner=owner,
            name="Otieno Sofas",
            phone="0711000000",
            location="Nairobi",
        )
        policy = BusinessPolicy.objects.get(business=business)
        policy.social_operating_mode = BusinessPolicy.OperatingMode.APPROVAL
        policy.save(update_fields=["social_operating_mode"])
        page = CommercePage.objects.get(business=business)
        page.is_published = True
        page.whatsapp = "0711000000"
        page.save(update_fields=["is_published", "whatsapp", "updated_at"])
        product = Product.objects.create(
            business=business,
            name="Grey sectional",
            price=12500,
            currency="KES",
            stock=2,
            status=Product.Status.ACTIVE,
        )
        Content.objects.create(
            business=business,
            product=product,
            platform=Content.Platform.FACEBOOK,
            content_type=Content.ContentType.POST,
            caption="The grey sectional is ready for the living room.",
            status=Content.Status.PUBLISHED,
        )
        Order.objects.create(
            business=business,
            product=product,
            customer_name="Wanjiku",
            phone="0700000000",
            quantity=1,
        )
        Lead.objects.create(
            business=business,
            customer_name="Wanjiku",
            source=Lead.Source.FACEBOOK,
            interest="Wants the grey sectional delivered in Nairobi.",
        )
        SocialMessage.objects.create(
            business=business,
            channel=SocialMessage.Channel.FACEBOOK,
            kind=SocialMessage.Kind.COMMENT,
            body="Is the grey sectional still available?",
            intent=SocialMessage.Intent.BUYING,
            draft_reply="Yes, it is on the store page.",
        )
        MorningBrief.objects.create(
            business=business,
            date=date.today(),
            status=MorningBrief.Status.READY,
            greeting="Good morning, Otieno Sofas.",
            sections={
                "pulse": {"summary": "One new order came in overnight."},
                "plan": {"steps": ["Reply to the sofa comment."]},
            },
        )
        KovaExchange.objects.create(
            business=business,
            user=owner,
            task="content_creation",
            request_text="Write a caption for the grey sectional.",
            response_text="Here is a caption.",
            status=KovaExchange.Status.COMPLETED,
            tool_calls=[{"tool_name": "create_content", "status": "completed"}],
        )

        dossier = build_dossier(business)
        self.assertIn(page.slug, dossier["store_url"])
        self.assertEqual(dossier["products"][0]["name"], "Grey sectional")
        self.assertIn(f"/store/{page.slug}/grey-sectional", dossier["products"][0]["url"])
        self.assertEqual(dossier["products"][0]["published"], 1)
        self.assertIn("Mode: Approval", dossier["policy_lines"])
        self.assertEqual(dossier["contents"][0]["caption"][:10], "The grey s")
        self.assertEqual(dossier["orders"][0]["customer"], "Wanjiku")
        self.assertEqual(dossier["messages"][0]["draft"], "Yes, it is on the store page.")
        self.assertEqual(dossier["brief"]["blocks"][0]["title"], "Pulse")
        self.assertEqual(dossier["exchanges"][0]["tools"], "create_content")

        admin = get_user_model().objects.create_superuser(
            email="admin@kova.test",
            password="StrongPassword123!",
            first_name="Kova",
            last_name="Admin",
        )
        self.client.force_login(admin)
        response = self.client.get(f"/admin/businesses/business/{business.id}/change/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Grey sectional")
        self.assertContains(response, "One new order came in overnight.")
        self.assertContains(response, "Write a caption for the grey sectional.")
        self.assertContains(response, "Is the grey sectional still available?")
