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
        top_priorities: { type: Type.ARRAY, items: { type: Type.STRING } },
        constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
        risk_factors: { type: Type.ARRAY, items: { type: Type.STRING } },
        detected_pains: { type: Type.ARRAY, items: { type: Type.STRING } },
        detected_goals: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["organization_type", "technical_maturity_level", "top_priorities", "constraints", "risk_factors", "detected_pains", "detected_goals"],
    },
    core_drivers: { type: Type.ARRAY, items: { type: Type.STRING } },
    top_recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          solution_name: { type: Type.STRING },
          architecture_layer: { type: Type.STRING },
          business_value: { type: Type.STRING },
          technical_reason: { type: Type.STRING },
          transcript_reference: { type: Type.STRING },
          confidence_score: { type: Type.NUMBER },
          impact_score: { type: Type.NUMBER, description: "Numeric score from 1-100 representing business impact." },
          pricing_model: { type: Type.STRING },
          estimated_monthly_cost: { type: Type.STRING, description: "Specific dollar amount (e.g., $150.00/mo)" },
          cost_breakdown: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed breakdown of costs for AWS services." },
          why_it_fits: { type: Type.STRING },
          potential_savings: { type: Type.STRING, description: "Estimated monthly savings or ROI impact." },
          complementary_solutions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Cross-sell opportunities." },
        },
        required: ["solution_name", "architecture_layer", "business_value", "technical_reason", "transcript_reference", "confidence_score", "impact_score", "pricing_model", "estimated_monthly_cost", "cost_breakdown", "why_it_fits", "potential_savings", "complementary_solutions"],
      },
    },
    matched_use_cases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          scenario_name: { type: Type.STRING },
          format: { type: Type.STRING, description: "SPAR or STAR" },
          situation: { type: Type.STRING },
          problem_or_task: { type: Type.STRING, description: "Problem for SPAR, Task for STAR" },
          action: { type: Type.STRING },
          result: { type: Type.STRING },
          industry_relevance: { type: Type.STRING },
        },
        required: ["scenario_name", "format", "situation", "problem_or_task", "action", "result", "industry_relevance"],
      },
    },
    diagrams: {
      type: Type.OBJECT,
      properties: {
        use_case_diagram: { type: Type.STRING, description: "Mermaid.js code for a Use Case diagram." },
        tech_architecture_diagram: { type: Type.STRING, description: "Mermaid.js code for a System Technical Architecture diagram." },
      },
      required: ["use_case_diagram", "tech_architecture_diagram"],
    },
    recommended_pilot: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        why_this_pilot: { type: Type.STRING },
        high_level_architecture: { type: Type.ARRAY, items: { type: Type.STRING } },
        measurable_success_metrics: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["name", "why_this_pilot", "high_level_architecture", "measurable_success_metrics"],
    },
    implementation_phases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          phase_name: { type: Type.STRING },
          focus: { type: Type.STRING },
          expected_outcome: { type: Type.STRING },
        },
        required: ["phase_name", "focus", "expected_outcome"],
      },
    },
    next_steps: {
      type: Type.OBJECT,
      properties: {
        demo_direction: { type: Type.STRING },
        follow_up_focus: { type: Type.STRING },
        validation_questions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "What to ask next to validate fit." },
      },
      required: ["demo_direction", "follow_up_focus", "validation_questions"],
    },
    executive_summary: { type: Type.STRING },
  },
  required: ["client_snapshot", "core_drivers", "top_recommendations", "matched_use_cases", "diagrams", "recommended_pilot", "implementation_phases", "next_steps", "executive_summary"],
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
            text: "Extract all text from this document. Maintain the structure as much as possible. If it's a chat log or technical document, ensure all details are captured accurately.",
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
- "reason": string (brief explanation if they don't match)

If the document is empty, assume it matches (for backward compatibility or if user only pastes transcript).
However, if both are provided, they MUST relate to the same cloud modernization context.`,
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

export async function analyzeTranscript(transcript: string, documentContext?: string) {
  const contextPrompt = documentContext 
    ? `Additional Document Context:
${documentContext}

` : "";

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a senior enterprise cloud solutions architect and executive technology strategist.
Analyze the following enterprise discovery call transcript (and optional document context) and produce a detailed, action-oriented cloud modernization strategy.
Focus specifically on:
- Key Recommendations: High-impact solutions that solve the core business problems.
- Architectural Layers: Clear mapping to Foundation, Identity, Network, Security, Storage, Compute, and AI.
- Use Case Alignment: Real-world scenarios extracted from the text.
- Financial Implications: Detailed AWS cost estimates and ROI considerations.

${contextPrompt}Transcript:
${transcript}

Strategic Requirements:
1. Executive Precision: Provide a punchy executive summary focused on the "Why" and "What now".
2. Business Outcomes: Clearly define the business value and expected outcomes for every recommendation.
3. Immediate Next Steps: Provide concise, outcome-oriented immediate actions. Include specific, high-impact demo directions and targeted validation questions to confirm strategy fit.
4. Architectural Layering: Map recommendations to Foundation, Identity, Network, Security, Storage, Compute, and AI layers.
5. Use Case Alignment: Identify at least 5 distinct, high-impact use cases from the transcript. Format each using the STAR (Situation, Task, Action, Result) or SPAR framework as appropriate, but prioritize STAR for at least 2 of them. Each use case must include a specific "industry_relevance" scenario.
6. Visual Strategy: Provide highly detailed Mermaid.js code for a Use Case diagram and a System Technical Architecture diagram. 
   - Use 'flowchart TD' for both diagrams.
   - For the Use Case diagram:
     *   Enclose all use cases in a 'subgraph' named "System Boundary".
     *   Represent Actors as square nodes outside the subgraph (e.g., 'Actor1[Stakeholder]').
     *   Represent Use Cases as stadium-shaped nodes inside the subgraph (e.g., 'UC1([Analyze Claims])').
     *   Use standard lines '---' for associations.
     *   For include/extend relationships, use labeled dotted lines with double quotes for the label (e.g., 'UC1 -. "<<include>>" .-> UC2').
   - For the System Technical Architecture diagram:
     *   Use subgraphs to represent architectural layers (Foundation, Identity, Network, Security, Storage, Compute, AI).
     *   Use specific AWS service names in nodes.
     *   Use '-->' for data flow.
     *   Ensure all node labels and subgraph titles are descriptive.
   - IMPORTANT: Ensure the Mermaid code is valid and does not contain any backticks or unquoted special characters in labels.
7. Pricing & Pilot: Include specific, actionable AWS monthly pricing estimates for each recommendation. The pricing_model should specify typical AWS models (e.g., On-Demand, Reserved Instances, Spot Instances, or Serverless/Pay-as-you-go). The cost_breakdown must detail the calculation logic for all core services involved (e.g., "EC2 t3.medium x 2: $60/mo", "RDS db.t3.small: $45/mo", "S3 1TB: $23/mo"). Provide a measurable pilot project.
8. Impact Scoring: For each recommendation, provide an "impact_score" (1-100) representing the strategic business value and a "confidence_score" (0.0-1.0) representing our certainty in the solution fit.

Output must be executive-ready: concise, high-impact, and devoid of technical fluff.`,
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
