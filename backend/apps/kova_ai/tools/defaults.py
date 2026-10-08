from .business_context import GetBusinessContextTool
from .create_content import CreateContentTool
from .create_lead import CreateLeadTool
from .get_analytics import GetAnalyticsTool
from .get_social_activity import GetSocialActivityTool
from .manage_commerce import ManageCommerceTool
from .manage_order import ManageOrderTool
from .manage_product import ManageProductTool
from .publish_content import PublishContentTool
from .respond_to_customer import RespondToCustomerTool
from .registry import ToolRegistry


def build_default_tool_registry() -> ToolRegistry:
    registry = ToolRegistry()

    registry.register(GetBusinessContextTool())
    registry.register(CreateContentTool())
    registry.register(PublishContentTool())

    registry.register(RespondToCustomerTool())
    registry.register(CreateLeadTool())

    registry.register(ManageProductTool())
    registry.register(ManageOrderTool())
    registry.register(ManageCommerceTool())

    registry.register(GetAnalyticsTool())
    registry.register(GetSocialActivityTool())

    return registry