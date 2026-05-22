"use client";

import { useState } from "react";
import {
  AttendanceChoiceStep,
  AttendanceReasonStep,
  AttendanceRemoveStep,
  AttendanceSketchCard,
} from "@/components/colleges/AttendanceConfirmSteps";
import {
  ATTENDANCE_DECLINE_PRESETS,
  validateDeclineReason,
} from "@/lib/data/formalAttendance";

type Step = "choice" | "reason" | "remove";

type Props = {
  college: string;
  onConfirm: () => void;
  onDecline: (options: { removeFromHistory: boolean }) => void;
};

/** UI-only attendance flow for attended-formal preview. */
export function ConfirmAttendanceSectionPreview({
  college,
  onConfirm,
  onDecline,
}: Props) {
  const [step, setStep] = useState<Step>("choice");
  const [reasonPreset, setReasonPreset] = useState<string>(
    ATTENDANCE_DECLINE_PRESETS[0],
  );
  const [reasonOther, setReasonOther] = useState("");
  const [error, setError] = useState<string | null>(null);

  function goToRemoveStep() {
    const validated = validateDeclineReason(reasonPreset, reasonOther);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    setError(null);
    setStep("remove");
  }

  return (
    <AttendanceSketchCard previewNote="Preview — nothing is saved to the database.">
      {step === "reason" ? (
        <AttendanceReasonStep
          reasonPreset={reasonPreset}
          reasonOther={reasonOther}
          error={error}
          submitting={false}
          onPresetChange={(preset) => {
            setReasonPreset(preset);
            setError(null);
          }}
          onOtherChange={(text) => {
            setReasonOther(text);
            setError(null);
          }}
          onBack={() => {
            setStep("choice");
            setError(null);
          }}
          onContinue={goToRemoveStep}
        />
      ) : step === "remove" ? (
        <AttendanceRemoveStep
          college={college}
          error={error}
          submitting={false}
          onRemove={() => onDecline({ removeFromHistory: true })}
          onKeep={() => onDecline({ removeFromHistory: false })}
          onBack={() => {
            setStep("reason");
            setError(null);
          }}
        />
      ) : (
        <AttendanceChoiceStep
          college={college}
          error={error}
          submitting={false}
          onConfirm={onConfirm}
          onDecline={() => {
            setStep("reason");
            setError(null);
          }}
        />
      )}
    </AttendanceSketchCard>
  );
}
