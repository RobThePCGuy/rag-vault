// HyDE (Hypothetical Document Embeddings) query expansion
//
// Generates hypothetical answer documents from a query, then embeds them
// alongside the original query. Each embedding becomes a separate voter
// in RRF fusion, improving recall for paraphrased or conceptual queries.
//
// Reference: Gao et al. "Precise Zero-Shot Dense Retrieval without Relevance Labels" (2022)

// ============================================
// Type Definitions
// ============================================

/**
 * HyDE configuration
 */
export interface HyDEConfig {
  /** Whether HyDE is enabled */
  enabled: boolean
  /** Backend for generating hypothetical documents */
  backend: 'rule-based' | 'api'
  /** Number of hypothetical documents to generate (default: 2) */
  numExpansions: number
  /** API key for LLM backend (optional) */
  apiKey?: string
  /** API base URL for LLM backend (optional) */
  apiBaseUrl?: string
  /** API model name for LLM backend (optional) */
  apiModel?: string
}

/**
 * Expanded query with weight
 */
export interface ExpandedQuery {
  /** The expanded query text */
  text: string
  /** Weight for RRF voting (original = 1.0, expansions = 0.5) */
  weight: number
}

// ============================================
// Query Pattern Detection
// ============================================

/** Common question word patterns */
const QUESTION_PATTERN = /^(what|how|why|when|where|who|which|can|does|is|are|was|were|do|did|should|could|would)\s+/i

/** Common technical/code patterns */
const CODE_PATTERN = /`[^`]+`|[A-Z][a-z]+[A-Z]|[a-z]+_[a-z]+|\.[a-z]+\(|ERR_|ERROR_|[A-Z_]{3,}/

/** Error message patterns */
const ERROR_PATTERN = /error|exception|fail|crash|bug|issue|problem|broken|not working/i

/**
 * Detect query intent for better expansion
 */
function detectQueryType(query: string): 'question' | 'error' | 'concept' | 'code' {
  if (ERROR_PATTERN.test(query)) return 'error'
  if (CODE_PATTERN.test(query)) return 'code'
  if (QUESTION_PATTERN.test(query)) return 'question'
  return 'concept'
}

// ============================================
// Rule-Based Expansion
// ============================================

/**
 * Generate hypothetical documents using rule-based templates.
 * Works offline with no dependencies — always available as a fallback.
 *
 * The strategy varies by detected query type:
 * - Questions: Convert to declarative statements
 * - Errors: Frame as troubleshooting documentation
 * - Code: Frame as technical documentation
 * - Concepts: Frame as explanatory documentation
 */
function ruleBasedExpansion(query: string, numExpansions: number): string[] {
  const queryType = detectQueryType(query)
  const expansions: string[] = []

  // Strip question marks for declarative reformulation
  const cleanQuery = query.replace(/\?+$/, '').trim()

  switch (queryType) {
    case 'question': {
      // Convert question to declarative statement
      const declarative = cleanQuery
        .replace(QUESTION_PATTERN, '')
        .trim()
      if (declarative.length > 3) {
        expansions.push(
          `${declarative.charAt(0).toUpperCase()}${declarative.slice(1)}. This is explained in detail in the documentation.`
        )
      }

      // Frame as a documentation excerpt
      expansions.push(
        `The documentation explains that ${cleanQuery.toLowerCase()}. The key points are as follows.`
      )

      // Frame as a guide section
      expansions.push(
        `A guide about ${cleanQuery.toLowerCase()} would cover the following topics and provide step-by-step instructions.`
      )
      break
    }

    case 'error': {
      // Frame as troubleshooting documentation
      expansions.push(
        `To resolve ${cleanQuery}, follow these troubleshooting steps. The root cause is typically related to configuration or dependencies.`
      )
      expansions.push(
        `The error "${cleanQuery}" occurs when the system encounters an unexpected state. The solution involves checking the following.`
      )
      expansions.push(
        `Common causes for ${cleanQuery} include misconfiguration, missing dependencies, and version incompatibilities. Here is how to fix it.`
      )
      break
    }

    case 'code': {
      // Frame as technical documentation
      expansions.push(
        `The implementation of ${cleanQuery} involves the following components and follows these patterns.`
      )
      expansions.push(
        `Documentation for ${cleanQuery}: This feature provides the following functionality and can be configured as described below.`
      )
      expansions.push(
        `${cleanQuery} is used to handle specific operations in the system. Here is how it works and how to use it correctly.`
      )
      break
    }

    case 'concept':
    default: {
      // General conceptual expansion
      expansions.push(
        `A document about ${cleanQuery} would discuss the following key aspects, including definitions, usage patterns, and best practices.`
      )
      expansions.push(
        `${cleanQuery.charAt(0).toUpperCase()}${cleanQuery.slice(1)} is a concept that encompasses several important areas. The documentation covers the following topics.`
      )
      expansions.push(
        `The following documentation explains ${cleanQuery} in detail, covering its purpose, implementation, and common use cases.`
      )
      break
    }
  }

  return expansions.slice(0, numExpansions)
}

// ============================================
// API-Based Expansion
// ============================================

/**
 * Generate hypothetical documents using an LLM API.
 * Falls back to rule-based expansion on failure.
 */
async function apiBasedExpansion(
  query: string,
  numExpansions: number,
  config: HyDEConfig
): Promise<string[]> {
  if (!config.apiKey) {
    console.error('HyDE: No API key configured, falling back to rule-based expansion')
    return ruleBasedExpansion(query, numExpansions)
  }

  const baseUrl = config.apiBaseUrl || 'https://api.anthropic.com'
  const model = config.apiModel || 'claude-3-haiku-20240307'

  try {
    const prompt = `Generate ${numExpansions} short hypothetical document excerpts (2-3 sentences each) that would be relevant to answering the following query. Each excerpt should sound like it comes from real documentation. Return only the excerpts, separated by newlines.

Query: ${query}`

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>
    }
    const text = data.content?.[0]?.text || ''
    const expansions = text
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 20)
      .slice(0, numExpansions)

    if (expansions.length === 0) {
      console.error('HyDE: API returned no valid expansions, falling back to rule-based')
      return ruleBasedExpansion(query, numExpansions)
    }

    return expansions
  } catch (error) {
    console.error(`HyDE: API expansion failed: ${(error as Error).message}, falling back to rule-based`)
    return ruleBasedExpansion(query, numExpansions)
  }
}

// ============================================
// HyDEExpander Class
// ============================================

/**
 * HyDE (Hypothetical Document Embeddings) query expander.
 *
 * Generates hypothetical answer documents from a query to improve
 * retrieval recall. Each expansion becomes an additional voter in
 * RRF fusion with a lower weight (0.5) than the original query (1.0).
 */
export class HyDEExpander {
  private readonly config: HyDEConfig

  constructor(config: HyDEConfig) {
    this.config = config
  }

  /**
   * Expand a query into the original plus hypothetical documents.
   *
   * @param query - The original search query
   * @returns Array of expanded queries with weights.
   *   First item is always the original query (weight 1.0).
   *   Subsequent items are hypothetical expansions (weight 0.5).
   */
  async expandQuery(query: string): Promise<ExpandedQuery[]> {
    if (!this.config.enabled) {
      return [{ text: query, weight: 1.0 }]
    }

    // Always include the original query at full weight
    const results: ExpandedQuery[] = [{ text: query, weight: 1.0 }]

    // Skip expansion for very short queries (less than 3 words)
    const wordCount = query.trim().split(/\s+/).length
    if (wordCount < 3) {
      return results
    }

    try {
      let expansions: string[]

      if (this.config.backend === 'api') {
        expansions = await apiBasedExpansion(query, this.config.numExpansions, this.config)
      } else {
        expansions = ruleBasedExpansion(query, this.config.numExpansions)
      }

      // Add expansions with lower weight
      for (const expansion of expansions) {
        results.push({ text: expansion, weight: 0.5 })
      }
    } catch (error) {
      console.error(`HyDE: Expansion failed: ${(error as Error).message}`)
      // Return just the original query on failure (graceful degradation)
    }

    return results
  }
}
