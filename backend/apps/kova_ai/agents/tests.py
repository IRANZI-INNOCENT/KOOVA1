"""
Tests for the Kova Agent.
"""

import json
from unittest.mock import Mock

from django.test import TestCase

from apps.kova_ai.context.types import (
    BusinessContext,
    ContextTask,
)
from apps.kova_ai.execution.types import (
    ExecutionResult,
    ExecutionStatus,
)
from apps.kova_ai.learning.types import (
    LearningResult,
    LearningType,
)
from apps.kova_ai.tools.business_context import GetBusinessContextTool
from apps.kova_ai.tools.registry import ToolRegistry
from apps.kova_ai.verification.types import (
    VerificationResult,
    VerificationStatus,
)

from .agent import KovaAgent, KovaAgentError


class FakeLLM:
    """Deterministic LLM substitute for agent tests."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def chat(self, **kwargs):
        """Return the next configured response."""

        self.calls.append(kwargs)

        if not self.responses:
            raise AssertionError(
                "FakeLLM has no remaining responses."
            )

        return self.responses.pop(0)


class KovaAgentTests(TestCase):
    """Test the production Kova agent loop."""

    def setUp(self):
        self.context = BusinessContext(
            business={
                "id": 1,
                "name": "Test Business",
                "industry": "Retail",
            },
            profile={
                "description": "A retail business.",
            },
            audience={
                "primary_audience": "Young adults.",
            },
            brand={
                "voice": "Friendly.",
            },
            goals={
                "primary_goal": "Increase awareness.",
            },
            policy={
                "allow_content_creation": True,
            },
            task=ContextTask.GENERAL,
        )

    def test_agent_returns_direct_response_without_tool(self):
        """The agent should return a normal LLM response."""

        llm = FakeLLM(
            [
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": (
                                    "Your primary goal is to increase "
                                    "product awareness."
                                ),
                            }
                        }
                    ],
                }
            ]
        )

        registry = ToolRegistry()

        agent = KovaAgent(
            llm=llm,
            tool_registry=registry,
        )

        result = agent.run(
            context=self.context,
            user_request="What is my primary business goal?",
        )

        self.assertEqual(
            result.message,
            "Your primary goal is to increase product awareness.",
        )

        self.assertEqual(
            result.tool_calls,
            (),
        )

    def test_agent_executes_requested_tool(self):
        """A model-requested tool should execute through the lifecycle."""

        llm = FakeLLM(
            [
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [
                                    {
                                        "id": "call_1",
                                        "type": "function",
                                        "function": {
                                            "name": "get_business_context",
                                            "arguments": json.dumps(
                                                {
                                                    "task": (
                                                        "content_creation"
                                                    ),
                                                }
                                            ),
                                        },
                                    }
                                ],
                            }
                        }
                    ],
                },
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": (
                                    "Your business wants to increase "
                                    "awareness."
                                ),
                            }
                        }
                    ],
                },
            ]
        )

        registry = ToolRegistry()
        registry.register(
            GetBusinessContextTool(),
        )

        agent = KovaAgent(
            llm=llm,
            tool_registry=registry,
        )

        result = agent.run(
            context=self.context,
            user_request="Tell me about my business goals.",
        )

        self.assertEqual(
            result.message,
            "Your business wants to increase awareness.",
        )

        self.assertEqual(
            len(result.tool_calls),
            1,
        )

        tool_call = result.tool_calls[0]

        self.assertEqual(
            tool_call.tool_name,
            "get_business_context",
        )

        self.assertEqual(
            tool_call.result["status"],
            "success",
        )

        self.assertEqual(
            tool_call.result["verification"]["status"],
            "verified",
        )

        self.assertEqual(
            tool_call.result["learning"]["type"],
            "success",
        )

        self.assertEqual(
            len(llm.calls),
            2,
        )

    def test_agent_exposes_registered_tools_to_model(self):
        """The LLM must receive the registered tool definitions."""

        llm = FakeLLM(
            [
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": "Done.",
                            }
                        }
                    ],
                }
            ]
        )

        registry = ToolRegistry()
        registry.register(
            GetBusinessContextTool(),
        )

        agent = KovaAgent(
            llm=llm,
            tool_registry=registry,
        )

        agent.run(
            context=self.context,
            user_request="Help me.",
        )

        request = llm.calls[0]

        self.assertEqual(
            request["tools"][0]["function"]["name"],
            "get_business_context",
        )

        self.assertEqual(
            request["tool_choice"],
            "auto",
        )

    def test_agent_rejects_empty_request(self):
        """Empty requests must not reach the LLM."""

        llm = FakeLLM([])

        agent = KovaAgent(
            llm=llm,
            tool_registry=ToolRegistry(),
        )

        with self.assertRaises(ValueError):
            agent.run(
                context=self.context,
                user_request="   ",
            )

        self.assertEqual(
            llm.calls,
            [],
        )

    def test_agent_rejects_invalid_tool_arguments(self):
        """Malformed tool arguments must stop the agent safely."""

        llm = FakeLLM(
            [
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [
                                    {
                                        "id": "call_1",
                                        "type": "function",
                                        "function": {
                                            "name": "get_business_context",
                                            "arguments": "{invalid",
                                        },
                                    }
                                ],
                            }
                        }
                    ],
                }
            ]
        )

        registry = ToolRegistry()
        registry.register(
            GetBusinessContextTool(),
        )

        agent = KovaAgent(
            llm=llm,
            tool_registry=registry,
        )

        with self.assertRaises(KovaAgentError):
            agent.run(
                context=self.context,
                user_request="Get my business context.",
            )

    def test_agent_stops_at_tool_round_limit(self):
        """Runaway tool loops must be bounded."""

        response = {
            "model": "google/gemini-3.8-flash",
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": "call_1",
                                "type": "function",
                                "function": {
                                    "name": "get_business_context",
                                    "arguments": json.dumps(
                                        {
                                            "task": "general",
                                        }
                                    ),
                                },
                            }
                        ],
                    }
                }
            ],
        }

        llm = FakeLLM(
            [
                response,
                response,
                response,
            ]
        )

        registry = ToolRegistry()
        registry.register(
            GetBusinessContextTool(),
        )

        agent = KovaAgent(
            llm=llm,
            tool_registry=registry,
            max_tool_rounds=2,
        )

        with self.assertRaises(KovaAgentError):
            agent.run(
                context=self.context,
                user_request="Keep researching.",
            )

        self.assertEqual(
            len(llm.calls),
            2,
        )

    def test_agent_constructs_decision_from_tool_request(self):
        """A tool request must become a Decision before execution."""

        llm = FakeLLM(
            [
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [
                                    {
                                        "id": "call_1",
                                        "type": "function",
                                        "function": {
                                            "name": "get_business_context",
                                            "arguments": json.dumps(
                                                {
                                                    "task": "general",
                                                }
                                            ),
                                        },
                                    }
                                ],
                            }
                        }
                    ],
                },
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": "Done.",
                            }
                        }
                    ],
                },
            ]
        )

        executor = Mock()

        executor.execute.return_value = ExecutionResult(
            status=ExecutionStatus.SUCCEEDED,
            message="Business context retrieved.",
            data={
                "business": {
                    "name": "Test Business",
                },
            },
        )

        verifier = Mock()

        verifier.verify.return_value = VerificationResult(
            status=VerificationStatus.VERIFIED,
            message="The action has been verified.",
            evidence={
                "execution_status": "succeeded",
            },
        )

        learner = Mock()

        learner.learn.return_value = LearningResult(
            learning_type=LearningType.SUCCESS,
            summary="Business context retrieval succeeded.",
            action="get_business_context",
            confidence=1.0,
        )

        registry = ToolRegistry()
        registry.register(
            GetBusinessContextTool(),
        )

        agent = KovaAgent(
            llm=llm,
            tool_registry=registry,
            action_executor=executor,
            verifier=verifier,
            learner=learner,
        )

        agent.run(
            context=self.context,
            user_request="Get my business context.",
        )

        executor.execute.assert_called_once()

        decision = executor.execute.call_args.kwargs["decision"]

        self.assertEqual(
            decision.action,
            "get_business_context",
        )

        self.assertEqual(
            decision.status,
            "ready",
        )

        self.assertEqual(
            decision.inputs,
            {
                "task": "general",
            },
        )

    def test_agent_runs_verification_after_execution(self):
        """Every tool execution must pass through verification."""

        llm = FakeLLM(
            [
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [
                                    {
                                        "id": "call_1",
                                        "type": "function",
                                        "function": {
                                            "name": "get_business_context",
                                            "arguments": json.dumps(
                                                {
                                                    "task": "general",
                                                }
                                            ),
                                        },
                                    }
                                ],
                            }
                        }
                    ],
                },
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": "Done.",
                            }
                        }
                    ],
                },
            ]
        )

        execution_result = ExecutionResult(
            status=ExecutionStatus.SUCCEEDED,
            message="Business context retrieved.",
            data={},
        )

        executor = Mock()
        executor.execute.return_value = execution_result

        verifier = Mock()
        verifier.verify.return_value = VerificationResult(
            status=VerificationStatus.INCONCLUSIVE,
            message="Could not verify.",
            evidence={},
        )

        learner = Mock()
        learner.learn.return_value = LearningResult(
            learning_type=LearningType.OBSERVATION,
            summary="Outcome was inconclusive.",
            action="get_business_context",
            confidence=0.5,
        )

        registry = ToolRegistry()
        registry.register(
            GetBusinessContextTool(),
        )

        agent = KovaAgent(
            llm=llm,
            tool_registry=registry,
            action_executor=executor,
            verifier=verifier,
            learner=learner,
        )

        result = agent.run(
            context=self.context,
            user_request="Get my business context.",
        )

        verifier.verify.assert_called_once()

        verification_kwargs = (
            verifier.verify.call_args.kwargs
        )

        self.assertIs(
            verification_kwargs["execution_result"],
            execution_result,
        )

        self.assertEqual(
            result.tool_calls[0].result["status"],
            "inconclusive",
        )

    def test_agent_runs_learning_after_verification(self):
        """Every verification outcome must be passed to learning."""

        llm = FakeLLM(
            [
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [
                                    {
                                        "id": "call_1",
                                        "type": "function",
                                        "function": {
                                            "name": "get_business_context",
                                            "arguments": json.dumps(
                                                {
                                                    "task": "general",
                                                }
                                            ),
                                        },
                                    }
                                ],
                            }
                        }
                    ],
                },
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": "Done.",
                            }
                        }
                    ],
                },
            ]
        )

        executor = Mock()

        execution_result = ExecutionResult(
            status=ExecutionStatus.SUCCEEDED,
            message="Retrieved.",
            data={},
        )

        executor.execute.return_value = execution_result

        verifier = Mock()

        verification_result = VerificationResult(
            status=VerificationStatus.VERIFIED,
            message="Verified.",
            evidence={},
        )

        verifier.verify.return_value = verification_result

        learner = Mock()

        learner.learn.return_value = LearningResult(
            learning_type=LearningType.SUCCESS,
            summary="Successful action.",
            action="get_business_context",
            confidence=1.0,
        )

        registry = ToolRegistry()
        registry.register(
            GetBusinessContextTool(),
        )

        agent = KovaAgent(
            llm=llm,
            tool_registry=registry,
            action_executor=executor,
            verifier=verifier,
            learner=learner,
        )

        agent.run(
            context=self.context,
            user_request="Get my business context.",
        )

        learner.learn.assert_called_once()

        learning_kwargs = (
            learner.learn.call_args.kwargs
        )

        self.assertIs(
            learning_kwargs["verification"],
            verification_result,
        )

    def test_agent_does_not_report_inconclusive_execution_as_success(self):
        """
        An inconclusive verification must never be exposed as success.
        """

        llm = FakeLLM(
            [
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [
                                    {
                                        "id": "call_1",
                                        "type": "function",
                                        "function": {
                                            "name": "get_business_context",
                                            "arguments": json.dumps(
                                                {
                                                    "task": "general",
                                                }
                                            ),
                                        },
                                    }
                                ],
                            }
                        }
                    ],
                },
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": "The result could not be verified.",
                            }
                        }
                    ],
                },
            ]
        )

        executor = Mock()

        executor.execute.return_value = ExecutionResult(
            status=ExecutionStatus.SUCCEEDED,
            message="Executed.",
            data={},
        )

        verifier = Mock()

        verifier.verify.return_value = VerificationResult(
            status=VerificationStatus.INCONCLUSIVE,
            message="The outcome could not be verified.",
            evidence={},
        )

        learner = Mock()

        learner.learn.return_value = LearningResult(
            learning_type=LearningType.OBSERVATION,
            summary="Outcome was inconclusive.",
            action="get_business_context",
            confidence=0.5,
        )

        registry = ToolRegistry()
        registry.register(
            GetBusinessContextTool(),
        )

        agent = KovaAgent(
            llm=llm,
            tool_registry=registry,
            verifier=verifier,
            learner=learner,
            action_executor=executor,
        )

        result = agent.run(
            context=self.context,
            user_request="Get my business context.",
        )

        tool_result = result.tool_calls[0].result

        self.assertEqual(
            tool_result["status"],
            "inconclusive",
        )

        self.assertNotEqual(
            tool_result["status"],
            "success",
        )

    def test_agent_passes_tool_arguments_to_executor(self):
        """Model-generated arguments must reach the executor unchanged."""

        llm = FakeLLM(
            [
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [
                                    {
                                        "id": "call_1",
                                        "type": "function",
                                        "function": {
                                            "name": "get_business_context",
                                            "arguments": json.dumps(
                                                {
                                                    "task": "commerce",
                                                }
                                            ),
                                        },
                                    }
                                ],
                            }
                        }
                    ],
                },
                {
                    "model": "google/gemini-3.8-flash",
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": "Done.",
                            }
                        }
                    ],
                },
            ]
        )

        executor = Mock()

        executor.execute.return_value = ExecutionResult(
            status=ExecutionStatus.SUCCEEDED,
            message="Retrieved.",
            data={},
        )

        verifier = Mock()

        verifier.verify.return_value = VerificationResult(
            status=VerificationStatus.VERIFIED,
            message="Verified.",
            evidence={},
        )

        learner = Mock()

        learner.learn.return_value = LearningResult(
            learning_type=LearningType.SUCCESS,
            summary="Successful.",
            action="get_business_context",
            confidence=1.0,
        )

        registry = ToolRegistry()
        registry.register(
            GetBusinessContextTool(),
        )

        agent = KovaAgent(
            llm=llm,
            tool_registry=registry,
            action_executor=executor,
            verifier=verifier,
            learner=learner,
        )

        agent.run(
            context=self.context,
            user_request="Get commerce context.",
        )

        executor_kwargs = (
            executor.execute.call_args.kwargs
        )

        self.assertEqual(
            executor_kwargs["arguments"],
            {
                "task": "commerce",
            },
        )