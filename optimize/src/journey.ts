import { z } from 'zod';
import type { Note, AppSettings } from '@notention/core';

export type AriaRole = 'button' | 'link' | 'textbox' | 'combobox' | 'dialog' | 'menuitem' | 'tab' | 'heading' | 'region' | 'listbox' | 'option' | 'checkbox' | 'radio' | 'switch' | 'slider' | 'spinbutton' | 'searchbox' | 'tablist' | 'tabpanel' | 'tree' | 'treeitem' | 'grid' | 'row' | 'cell' | 'columnheader' | 'rowheader' | 'gridcell' | 'img' | 'banner' | 'complementary' | 'contentinfo' | 'form' | 'main' | 'navigation' | 'region' | 'search' | 'alert' | 'log' | 'marquee' | 'status' | 'timer' | 'progressbar' | 'separator' | 'tooltip';

export type Step =
    | { kind: 'seed'; notes: Note[]; settings?: Partial<AppSettings> }
    | { kind: 'navigate'; hash: string }
    | { kind: 'act'; target: Target; action: 'click' | 'fill' | 'press' | 'select'; value?: string }
    | { kind: 'assertAria'; target: Target; snapshot: string }
    | { kind: 'assertState'; path: string; equals: unknown }
    | { kind: 'assertNoConsoleErrors' }
    | { kind: 'capture'; label: string }
    | { kind: 'script'; code: string }
    | { kind: 'waitForState'; path: string; equals: unknown; timeoutMs?: number }
    | { kind: 'captureAria'; label: string }
    | { kind: 'assertAriaSnapshot'; target: Target; snapshot: string }
    | { kind: 'assertFocus'; target: Target }
    | { kind: 'assertAccessibleName'; target: Target; expected: string }
    | { kind: 'assertRole'; target: Target; expectedRole: string };

export type Target =
    | { role: AriaRole; name: string | RegExp; modal?: string }
    | { testId: string; modal?: string }
    | { label: string; modal?: string };

export interface JourneySpec {
    id: string;
    version: number;
    intent: string;
    journeysTouched: string[];
    seed: { notes: Note[]; settings: Partial<AppSettings> };
    steps: Step[];
    teardown?: Step[];
    status: 'draft' | 'ready';
}

// Use loose schema for Target to avoid AriaRole constraint issues
const TargetSchema = z.union([
    z.object({ role: z.string(), name: z.union([z.string(), z.any()]) }),
    z.object({ testId: z.string() }),
    z.object({ label: z.string() }),
]);

const SeedStepSchema = z.object({ kind: z.literal('seed'), notes: z.array(z.any()), settings: z.record(z.any()).optional() });
const NavigateStepSchema = z.object({ kind: z.literal('navigate'), hash: z.string() });
const ActStepSchema = z.object({ kind: z.literal('act'), target: TargetSchema, action: z.enum(['click', 'fill', 'press', 'select']), value: z.string().optional() });
const ScriptStepSchema = z.object({ kind: z.literal('script'), code: z.string() });
const WaitForStateStepSchema = z.object({ kind: z.literal('waitForState'), path: z.string(), equals: z.any(), timeoutMs: z.number().optional() });
const CaptureAriaStepSchema = z.object({ kind: z.literal('captureAria'), label: z.string() });
const AssertAriaSnapshotStepSchema = z.object({ kind: z.literal('assertAriaSnapshot'), target: TargetSchema, snapshot: z.string() });
const AssertFocusStepSchema = z.object({ kind: z.literal('assertFocus'), target: TargetSchema });
const AssertAccessibleNameStepSchema = z.object({ kind: z.literal('assertAccessibleName'), target: TargetSchema, expected: z.string() });
const AssertRoleStepSchema = z.object({ kind: z.literal('assertRole'), target: TargetSchema, expectedRole: z.string() });
const AssertAriaStepSchema = z.object({ kind: z.literal('assertAria'), target: TargetSchema, snapshot: z.string() });
const AssertStateStepSchema = z.object({ kind: z.literal('assertState'), path: z.string(), equals: z.any() });
const AssertNoConsoleErrorsStepSchema = z.object({ kind: z.literal('assertNoConsoleErrors') });
const CaptureStepSchema = z.object({ kind: z.literal('capture'), label: z.string() });

export const StepSchema = z.discriminatedUnion('kind', [
    SeedStepSchema,
    NavigateStepSchema,
    ActStepSchema,
    AssertAriaStepSchema,
    AssertStateStepSchema,
    AssertNoConsoleErrorsStepSchema,
    CaptureStepSchema,
    ScriptStepSchema,
    WaitForStateStepSchema,
    CaptureAriaStepSchema,
    AssertAriaSnapshotStepSchema,
    AssertFocusStepSchema,
    AssertAccessibleNameStepSchema,
    AssertRoleStepSchema,
]) as z.ZodType<Step>;

export const JourneySpecSchema = z.object({
    id: z.string(),
    version: z.number().int().positive(),
    intent: z.string(),
    journeysTouched: z.array(z.string()),
    seed: z.object({ notes: z.array(z.any()), settings: z.record(z.any()) }),
    steps: z.array(StepSchema),
    teardown: z.array(StepSchema).optional(),
    status: z.enum(['draft', 'ready']),
});

export function validateJourneySpec(spec: unknown): JourneySpec {
    return JourneySpecSchema.parse(spec);
}