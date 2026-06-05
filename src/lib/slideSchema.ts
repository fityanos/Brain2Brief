import { z } from 'zod'

export const SlideTypeSchema = z.enum([
  'title',
  'bullets',
  'quote',
  'code',
  'two-col',
])
export type SlideType = z.infer<typeof SlideTypeSchema>

export const SlideSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('title'),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal('bullets'),
    title: z.string().min(1),
    bullets: z.array(z.string().min(1)).min(1).max(7),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal('quote'),
    title: z.string().optional(),
    quote: z.string().min(1),
    attribution: z.string().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal('code'),
    title: z.string().min(1),
    language: z.string().default('text'),
    code: z.string().min(1),
    caption: z.string().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal('two-col'),
    title: z.string().min(1),
    left: z.object({ heading: z.string().optional(), bullets: z.array(z.string()).min(1) }),
    right: z.object({ heading: z.string().optional(), bullets: z.array(z.string()).min(1) }),
    notes: z.string().optional(),
  }),
])
export type Slide = z.infer<typeof SlideSchema>

export const ThemeSchema = z.enum(['minimal', 'dark', 'corporate'])
export type Theme = z.infer<typeof ThemeSchema>

export const DeckSchema = z.object({
  title: z.string().min(1),
  theme: ThemeSchema.default('minimal'),
  slides: z.array(SlideSchema).min(1).max(12),
})
export type Deck = z.infer<typeof DeckSchema>

export const ClarifyTurnSchema = z.object({
  kind: z.literal('clarify'),
  ready: z.boolean(),
  confidence: z.number().min(0).max(1),
  next_question: z.string().optional(),
  rationale: z.string().optional(),
  missing: z.array(z.string()).optional(),
})
export type ClarifyTurn = z.infer<typeof ClarifyTurnSchema>

export const GenerateTurnSchema = z.object({
  kind: z.literal('generate'),
  deck: DeckSchema,
})
export type GenerateTurn = z.infer<typeof GenerateTurnSchema>

export const AssistantTurnSchema = z.discriminatedUnion('kind', [
  ClarifyTurnSchema,
  GenerateTurnSchema,
])
export type AssistantTurn = z.infer<typeof AssistantTurnSchema>
