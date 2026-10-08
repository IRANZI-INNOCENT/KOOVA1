"""
Serializers for the Kova Agent API.
"""

from rest_framework import serializers

from apps.kova_ai.context.types import ContextTask


class KovaAgentRequestSerializer(serializers.Serializer):
    """
    Validate a request sent to the Kova Agent.

    The business is explicitly identified because one authenticated
    user may eventually operate multiple businesses.
    """

    business_id = serializers.IntegerField(
        min_value=1,
    )

    message = serializers.CharField(
        max_length=4000,
        allow_blank=False,
        trim_whitespace=True,
    )

    task = serializers.ChoiceField(
        choices=[
            (task.value, task.value)
            for task in ContextTask
        ],
        default=ContextTask.GENERAL.value,
    )


class KovaAgentResponseSerializer(serializers.Serializer):
    """Serialize a successful Kova Agent response."""

    message = serializers.CharField()

    model = serializers.CharField(
        allow_null=True,
        required=False,
    )

    tool_calls = serializers.ListField(
        child=serializers.DictField(),
    )