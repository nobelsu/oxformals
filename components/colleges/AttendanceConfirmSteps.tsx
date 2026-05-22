"use client";

import type { ReactNode } from "react";
import { SketchCard } from "@/components/ui/SketchCard";
import { OutlineButton } from "@/components/ui/OutlineButton";
import { OutlineTextArea } from "@/components/ui/OutlineTextArea";
import { SketchRadioGroup, SketchRadioOption } from "@/components/ui/SketchRadioGroup";
import {
  ATTENDANCE_DECLINE_PRESET_OTHER,
  ATTENDANCE_DECLINE_PRESETS,
} from "@/lib/data/formalAttendance";

export function AttendanceSketchCard({
  children,
  previewNote,
}: {
  children: ReactNode;
  previewNote?: string;
}) {
  return (
    <SketchCard className="p-5">
      {previewNote ? (
        <p className="mb-3 text-xs text-[var(--ink-soft)]">{previewNote}</p>
      ) : null}
      {children}
    </SketchCard>
  );
}

export function AttendanceStepTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display text-lg uppercase tracking-wide text-[var(--ink)]">
      {children}
    </h3>
  );
}

export function AttendanceStepBody({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm text-[var(--ink-muted)]">{children}</p>;
}

export function AttendanceStepError({ message }: { message: string }) {
  return (
    <p className="mt-3 text-sm text-[var(--accent-hover)]" role="alert">
      {message}
    </p>
  );
}

export function AttendanceChoiceStep({
  college,
  error,
  submitting,
  onConfirm,
  onDecline,
}: {
  college: string;
  error: string | null;
  submitting: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  return (
    <>
      <AttendanceStepTitle>Confirm attendance</AttendanceStepTitle>
      <AttendanceStepBody>
        Before you can rate {college}&apos;s formal, let us know if you went.
        This helps keep college rankings accurate.
      </AttendanceStepBody>
      {error ? <AttendanceStepError message={error} /> : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <OutlineButton
          variant="filled"
          disabled={submitting}
          onClick={onConfirm}
        >
          {submitting ? "Saving…" : "Yes, I attended this formal"}
        </OutlineButton>
        <OutlineButton
          variant="outline"
          disabled={submitting}
          onClick={onDecline}
        >
          No, I didn&apos;t attend
        </OutlineButton>
      </div>
    </>
  );
}

export function AttendanceReasonStep({
  reasonPreset,
  reasonOther,
  error,
  submitting,
  onPresetChange,
  onOtherChange,
  onBack,
  onContinue,
}: {
  reasonPreset: string;
  reasonOther: string;
  error: string | null;
  submitting: boolean;
  onPresetChange: (preset: string) => void;
  onOtherChange: (text: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <AttendanceStepTitle>Why didn&apos;t you attend?</AttendanceStepTitle>
      <AttendanceStepBody>
        This helps us understand no-shows. Your answer is not shared with the
        host.
      </AttendanceStepBody>
      <SketchRadioGroup label="Reason you did not attend">
        {ATTENDANCE_DECLINE_PRESETS.map((preset) => (
          <SketchRadioOption
            key={preset}
            name="decline-reason"
            value={preset}
            label={preset}
            checked={reasonPreset === preset}
            disabled={submitting}
            onSelect={() => onPresetChange(preset)}
          />
        ))}
      </SketchRadioGroup>
      {reasonPreset === ATTENDANCE_DECLINE_PRESET_OTHER ? (
        <OutlineTextArea
          className="mt-3"
          value={reasonOther}
          onChange={(e) => onOtherChange(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Tell us what happened…"
          aria-label="Reason you did not attend"
        />
      ) : null}
      {error ? <AttendanceStepError message={error} /> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <OutlineButton variant="outline" disabled={submitting} onClick={onBack}>
          Back
        </OutlineButton>
        <OutlineButton variant="filled" disabled={submitting} onClick={onContinue}>
          Continue
        </OutlineButton>
      </div>
    </>
  );
}

export function AttendanceRemoveStep({
  college,
  error,
  submitting,
  onRemove,
  onKeep,
  onBack,
}: {
  college: string;
  error: string | null;
  submitting: boolean;
  onRemove: () => void;
  onKeep: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <AttendanceStepTitle>Remove from your history?</AttendanceStepTitle>
      <AttendanceStepBody>
        Remove this {college} formal from &ldquo;Formals I attended&rdquo;? You
        can keep it listed if you still want a record of the swap.
      </AttendanceStepBody>
      {error ? <AttendanceStepError message={error} /> : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <OutlineButton variant="filled" disabled={submitting} onClick={onRemove}>
          {submitting ? "Saving…" : "Yes, remove it"}
        </OutlineButton>
        <OutlineButton variant="outline" disabled={submitting} onClick={onKeep}>
          No, keep in my list
        </OutlineButton>
        <OutlineButton variant="ghost" disabled={submitting} onClick={onBack}>
          Back
        </OutlineButton>
      </div>
    </>
  );
}
