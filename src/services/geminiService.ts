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
    top_recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          solution_name: { type: Type.STRING },
          estimated_monthly_cost: { type: Type.STRING },
          cost_breakdown: { type: Type.ARRAY, items: { type: Type.STRING } },
          business_value: { type: Type.STRING },
        },
        required: ["solution_name", "estimated_monthly_cost", "cost_breakdown", "business_value"],
      },
    },
    total_cost_of_ownership: {
      type: Type.OBJECT,
      properties: {
        total_monthly_estimate: { type: Type.STRING },
        one_time_setup_cost: { type: Type.STRING },
        three_year_roi: { type: Type.STRING },
        cost_optimization_strategy: { type: Type.STRING },
      },
      required: ["total_monthly_estimate", "one_time_setup_cost", "three_year_roi", "cost_optimization_strategy"],
    },
    solution_set: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          solutions: { type: Type.ARRAY, items: { type: Type.STRING } },
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
          current_workflow: { type: Type.STRING, description: "Steps + pain points + leakage" },
          desired_workflow: { type: Type.STRING, description: "Trigger -> steps -> decision points -> outputs" },
          data_integrations: { type: Type.STRING, description: "Inputs, outputs, permissions, frequency, latency" },
          value_metrics: { type: Type.STRING, description: "KPI targets + measurement method" },
          constraints_risks: { type: Type.STRING, description: "Compliance, security, adoption blockers" },
          acceptance_criteria: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Done when... bullet list" },
          priority_timeline: { type: Type.STRING, description: "Must-have vs nice-to-have, phases, stakeholders" },
        },
        required: ["title", "client_statement", "who_where", "current_workflow", "desired_workflow", "data_integrations", "value_metrics", "constraints_risks", "acceptance_criteria", "priority_timeline"],
      },
    },
    diagrams: {
      type: Type.OBJECT,
      properties: {
        use_case_diagram: { type: Type.STRING, description: "Mermaid.js code for a Use Case diagram." },
        tech_architecture_diagram: { type: Type.STRING, description: "Mermaid.js code for a System Technical Architecture diagram." },
        architecture_definition: { type: Type.STRING, description: "Textual definition of the architecture." },
      },
      required: ["use_case_diagram", "tech_architecture_diagram", "architecture_definition"],
    },
    executive_summary: { type: Type.STRING },
  },
  required: ["client_snapshot", "recommendation", "top_recommendations", "total_cost_of_ownership", "solution_set", "client_references", "matched_use_cases", "diagrams", "executive_summary"],
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
   - Current Workflow: Steps, pain points, leakage.
   - Desired Workflow: Trigger -> steps -> decision points -> outputs.
   - Data & Integrations: Inputs, outputs, permissions, frequency, latency.
   - Value & Success Metrics: KPI targets + measurement method.
   - Constraints & Risks: Compliance, security, adoption blockers.
   - Acceptance Criteria: Bullet list.
   - Priority + Timeline: Must-have vs nice-to-have, phases, stakeholders.

2. Visual Strategy: Provide Mermaid.js 'flowchart TD' code for:
   - Use Case Diagram: Actors outside, use cases inside a "System Boundary" subgraph.
   - Technical Architecture: Layers (Foundation, Identity, Network, Security, Storage, Compute, AI) as subgraphs.

3. Solution Set: Group proposed solutions by category.
4. Client References: Provide industry-specific success stories.
5. Technical Architecture Definition: A textual description of the proposed architecture.
6. Price of each solution: Detailed AWS monthly costs for each recommendation.
7. Total Cost of Ownership (TCO): Monthly estimate, setup cost, 3-year ROI, and optimization strategy.
8. Recommendation: A single, central strategic recommendation.

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
