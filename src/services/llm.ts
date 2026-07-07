import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMReviewResponse } from '../types';
import { buildReviewPrompt, extractFilenamesFromDiff, filterHallucinatedFiles } from '../prompts/reviewPrompt';
import { validateLLMResponse } from '../validators/llmResponseValidator';
import { logger } from '../utils/logger';

export class LLMService {
  private genAI: GoogleGenerativeAI;
  // Use flash for speed, cost, and native JSON mode support
  private modelName = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Sends the PR diff to Gemini and returns the validated structured JSON response.
   * Tracks token usage.
   */
  async reviewCode(
    diff: string,
    prTitle: string,
    isTruncated: boolean,
  ): Promise<{ response: LLMReviewResponse; inputTokens: number; outputTokens: number }> {
    const prompt = buildReviewPrompt(diff, prTitle, isTruncated);
    const validFilenames = extractFilenamesFromDiff(diff);

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        // This is the killer feature: native JSON enforcement
        responseMimeType: 'application/json',
      },
    });

    let rawOutput = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      logger.info(`[llm] Sending review request to ${this.modelName}...`);
      const result = await model.generateContent(prompt);
      
      const response = result.response;
      rawOutput = response.text();
      
      inputTokens = response.usageMetadata?.promptTokenCount || 0;
      outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

      logger.info(`[llm] Received response. Tokens used: ${inputTokens} in, ${outputTokens} out.`);

      // 1. Validate JSON and Schema
      const parsedResponse = validateLLMResponse(rawOutput);

      // 2. Filter out any hallucinated file references
      const safeResponse = filterHallucinatedFiles(parsedResponse, validFilenames);

      return {
        response: safeResponse,
        inputTokens,
        outputTokens,
      };
    } catch (err) {
      logger.error('[llm] Error calling Gemini API', { error: (err as Error).message });
      throw err;
    }
  }
}

export const llmService = new LLMService();
