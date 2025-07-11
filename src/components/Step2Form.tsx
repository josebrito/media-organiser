import React, { useState } from "react";
import { Form, ActionPanel, Action } from "@raycast/api";
import { ProjectAssignment } from "../types";

interface Step2FormProps {
  dates: Date[];
  onSubmit: (projectAssignments: ProjectAssignment[]) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function Step2Form({ dates, onSubmit, onBack, isLoading }: Step2FormProps) {
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});

  const handleSubmit = (values: Record<string, string>) => {
    const projectAssignments: ProjectAssignment[] = dates.map((date) => ({
      date,
      projectName: values[`project_${date.toISOString()}`] || `Project_${date.toDateString()}`,
    }));
    onSubmit(projectAssignments);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Organize Files" onSubmit={handleSubmit} />
          <Action title="Back to Step 1" onAction={onBack} shortcut={{ modifiers: ["cmd"], key: "[" }} />
        </ActionPanel>
      }
    >
      <Form.Description text="Step 2: Assign project names to each date" />

      {dates.map((date) => (
        <Form.TextField
          key={date.toISOString()}
          id={`project_${date.toISOString()}`}
          placeholder={`${formatDate(date)}`}
          value={projectNames[`project_${date.toISOString()}`] || ""}
          onChange={(value) =>
            setProjectNames((prev) => ({
              ...prev,
              [`project_${date.toISOString()}`]: value,
            }))
          }
        />
      ))}
    </Form>
  );
}
