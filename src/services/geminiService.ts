import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const ARCHITECT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    client_snapshot: {
      type: Type.OBJECT,
      properties: {
        organization_type: { type: Type.STRING },
        technical_maturity_level: { type: Type.STRING },
      },
      required: ["organization_type", "technical_maturity_level"],
    },
    recommendation: { type: Type.STRING, description: "The central strategic recommendation." },
    total_cost_of_ownership: {
      type: Type.OBJECT,
      properties: {
        total_monthly_estimate: { type: Type.STRING },
        total_yearly_estimate: { type: Type.STRING },
        monthly_est_math_reasoning: { type: Type.STRING, description: "Detailed math and reasoning for monthly estimate." },
        monthly_breakdown: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              cost: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["category", "cost", "reasoning"]
          }
        },
        one_time_setup_cost: { type: Type.STRING },
        setup_cost_math_reasoning: { type: Type.STRING, description: "Detailed math and reasoning for setup cost." },
        setup_breakdown: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              item: { type: Type.STRING },
              cost: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["item", "cost", "reasoning"]
          }
        },
        three_year_roi: { type: Type.STRING },
        roi_math_reasoning: { type: Type.STRING, description: "Detailed math and reasoning for ROI calculation." },
        roi_breakdown: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              metric: { type: Type.STRING },
              value: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["metric", "value", "reasoning"]
          }
        },
        cost_optimization_strategy: { type: Type.STRING },
        optimization_judgment: { type: Type.STRING, description: "Expert judgment on the optimization strategy." },
      },
      required: [
        "total_monthly_estimate", "total_yearly_estimate", "monthly_est_math_reasoning", "monthly_breakdown",
        "one_time_setup_cost", "setup_cost_math_reasoning", "setup_breakdown",
        "three_year_roi", "roi_math_reasoning", "roi_breakdown",
        "cost_optimization_strategy", "optimization_judgment"
      ],
    },
    solution_set: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          solutions: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                estimated_monthly_cost: { type: Type.STRING },
                pricing_reasoning: { type: Type.STRING, description: "Detailed reasoning for the total estimated price." },
                cost_breakdown: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      item: { type: Type.STRING, description: "Specific line item (e.g., EC2 Instance, Data Transfer)." },
                      cost: { type: Type.STRING, description: "Estimated monthly cost for this item." },
                      reasoning: { type: Type.STRING, description: "Detailed reasoning for this specific line item cost." }
                    },
                    required: ["item", "cost", "reasoning"]
                  },
                  description: "Granular breakdown of costs for this solution."
                },
                detailed_explanation: { type: Type.STRING, description: "In-depth explanation of the solution." }
              },
              required: ["name", "estimated_monthly_cost", "pricing_reasoning", "cost_breakdown", "detailed_explanation"]
            } 
          },
        },
        required: ["category", "solutions"],
      },
    },
    client_references: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          industry: { type: Type.STRING },
          company_size: { type: Type.STRING },
          success_story: { type: Type.STRING },
        },
        required: ["industry", "company_size", "success_story"],
      },
    },
    matched_use_cases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Verb + object + outcome" },
          client_statement: { type: Type.STRING, description: "2-3 sentences: what they're trying to do and why now" },
          who_where: { type: Type.STRING, description: "Personas, teams, environment" },
          current_workflow_description: { type: Type.STRING, description: "High-level overview of the current process." },
          current_workflow_steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Granular, sequential steps of the current workflow." },
          potential_bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific pain points, delays, or failure points in the current workflow." },
          desired_workflow_description: { type: Type.STRING, description: "High-level overview of the target state." },
          desired_workflow_steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Granular, sequential steps of the modernized workflow." },
          data_integrations: { type: Type.STRING, description: "Inputs, outputs, permissions, frequency, latency" },
          value_metrics: { type: Type.STRING, description: "KPI targets + measurement method" },
          constraints_risks: { type: Type.STRING, description: "Compliance, security, adoption blockers" },
          acceptance_criteria: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Done when... bullet list" },
          priority_timeline: { type: Type.STRING, description: "Must-have vs nice-to-have, phases, stakeholders" },
        },
        required: [
          "title", "client_statement", "who_where", 
          "current_workflow_description", "current_workflow_steps", "potential_bottlenecks",
          "desired_workflow_description", "desired_workflow_steps",
          "data_integrations", "value_metrics", "constraints_risks", "acceptance_criteria", "priority_timeline"
        ],
      },
    },
    executive_summary: { type: Type.STRING },
    technical_architecture_diagram: { type: Type.STRING, description: "Highly detailed ASCII boxed reference architecture diagram with inline explanations and service-level granularity." },
    sales_intelligence: {
      type: Type.OBJECT,
      properties: {
        sentiment_score: { type: Type.STRING, description: "Overall sentiment (0-100)" },
        sentiment_summary: { type: Type.STRING },
        buying_signals: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              signal: { type: Type.STRING },
              confidence: { type: Type.STRING },
              evidence: { type: Type.STRING }
            },
            required: ["signal", "confidence", "evidence"]
          }
        },
        medpicc: {
          type: Type.OBJECT,
          properties: {
            metrics: { type: Type.STRING },
            economic_buyer: { type: Type.STRING },
            decision_criteria: { type: Type.STRING },
            decision_process: { type: Type.STRING },
            identify_pain: { type: Type.STRING },
            champion: { type: Type.STRING },
            competition: { type: Type.STRING }
          },
          required: ["metrics", "economic_buyer", "decision_criteria", "decision_process", "identify_pain", "champion", "competition"]
        }
      },
      required: ["sentiment_score", "sentiment_summary", "buying_signals", "medpicc"]
    }
  },
  required: ["client_snapshot", "recommendation", "total_cost_of_ownership", "solution_set", "client_references", "matched_use_cases", "executive_summary", "technical_architecture_diagram", "sales_intelligence"],
};

export async function performOCR(base64Data: string, mimeType: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Extract all text from this document. Maintain the structure as much as possible.",
          },
        ],
      },
    ],
  });

  return response.text || "";
}

export async function validateDocumentMatch(documentText: string, transcriptText: string): Promise<{ matches: boolean; reason?: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Compare the following two texts:
            
Document Content:
${documentText}

Input Transcript:
${transcriptText}

Determine if the Input Transcript belongs to the same company, project, or context as the Document Content. 
Return a JSON object with:
- "matches": boolean
- "reason": string (brief explanation if they don't match)`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matches: { type: Type.BOOLEAN },
          reason: { type: Type.STRING },
        },
        required: ["matches"],
      },
    },
  });

  try {
    return JSON.parse(response.text || '{"matches": false}');
  } catch (e) {
    return { matches: false, reason: "Failed to parse validation result." };
  }
}

export async function diarizeSpeaker(text: string, person1Context: string, person2Context: string): Promise<1 | 2> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Based on the following conversation context and the new text, determine who is the most likely speaker.
            
Person 1 (Customer) Context: ${person1Context}
Person 2 (Architect) Context: ${person2Context}

New Text: "${text}"

Return a JSON object with "speaker": 1 or 2.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          speaker: { type: Type.INTEGER },
        },
        required: ["speaker"],
      },
    },
  });

  try {
    const result = JSON.parse(response.text || '{"speaker": 1}');
    return result.speaker === 2 ? 2 : 1;
  } catch (e) {
    return 1;
  }
}

export async function analyzeTranscript(transcript: string, documentContext?: string) {
  const contextPrompt = documentContext 
    ? `Additional Document Context:
${documentContext}

` : "";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", // Using Flash for speed as requested (1.5s target)
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a senior enterprise cloud solutions architect.
Analyze the following transcript and produce a detailed cloud modernization strategy.

${contextPrompt}Transcript:
${transcript}

Strategic Requirements:
1. Use Case (Format A): Identify high-impact use cases. For each, provide:
   - Title: Verb + object + outcome
   - Client Statement: 2-3 sentences on what they're trying to do.
   - Who/Where: Personas, teams, environment.
   - Current Workflow: A high-level description, followed by granular, sequential steps and a list of specific potential bottlenecks.
   - Desired Workflow: A high-level description of the target state, followed by granular, sequential steps of the modernized process.
   - Data & Integrations: Inputs, outputs, permissions, frequency, latency.
   - Value & Success Metrics: KPI targets + measurement method.
   - Constraints & Risks: Compliance, security, adoption blockers.
   - Acceptance Criteria: Bullet list.
   - Priority + Timeline: Must-have vs nice-to-have, phases, stakeholders.

2. Technical Architecture Definition: Provide an advanced-level technical explanation of the proposed architecture, detailing the design patterns (e.g., Event-Driven, Microservices), security posture, and data flow. This must be followed by a highly detailed Technical Architecture Diagram in ASCII boxed format. The diagram MUST:
   - Use boxes, arrows, and clear boundaries to show flow and relationships.
   - Include specific service names (e.g., AWS Lambda, Amazon RDS, Amazon SQS).
   - Label key components with their specific roles and advanced configurations (e.g., "Auth Layer - Cognito", "Data Persistence - DynamoDB with DAX").
   - Include brief inline annotations or callouts within the ASCII structure to explain complex interactions (e.g., "Asynchronous Processing via SQS", "Multi-AZ for High Availability").
   - Be comprehensive, covering ingestion, processing, storage, and security layers.
3. Solution Set & Pricing: Group proposed solutions by category. For EACH solution, provide:
   - Name: The specific AWS service or solution.
   - Estimated Monthly Cost: A clear dollar amount (round to the nearest whole number).
   - Pricing Reasoning: High-level explanation of the total cost.
   - Cost Breakdown: A granular list of line items, each with its own cost (rounded) and specific reasoning.
   - Detailed Explanation: In-depth description of how the solution works and its benefits.

4. Sales Intelligence (Spiked AI Engine):
   - Sentiment Analysis: Overall sentiment score (0-100) and a qualitative summary.
   - Buying Signals: Identify specific verbal cues that indicate intent to purchase or move forward.
   - MEDPICC Analysis: Evaluate the deal based on Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion, and Competition.

5. Client References: Provide industry-specific success stories.
6. Total Cost of Ownership (TCO): Provide:
   - Monthly Estimate: Total monthly cost (rounded) with detailed math and reasoning, plus a granular breakdown of categories.
   - Yearly Estimate: Total yearly cost (rounded).
   - Setup Cost: One-time costs (rounded) with detailed math and reasoning, plus a granular breakdown of items.
   - 3-Year ROI: Calculation and reasoning for the return on investment, plus a granular breakdown of metrics.
   - Optimization Strategy: How to reduce costs over time.
   - Optimization Judgment: Expert judgment on the feasibility and impact of the strategy.

7. Recommendation: A single, central strategic recommendation.

Output must be concise and executive-ready.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: ARCHITECT_SCHEMA,
    },
  });

  return JSON.parse(response.text || "{}");
}
