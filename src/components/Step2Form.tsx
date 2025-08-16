import React, { useState } from "react";
import { Form, ActionPanel, Action } from "@raycast/api";
import { ProjectAssignment } from "../common/types";

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
    // Format as YYYYMMDD for folder naming
    return (
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0")
    );
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

      {dates
        .slice()
        .sort((a, b) => a.getTime() - b.getTime())
        .map((date) => (
          <Form.TextField
            key={date.toISOString()}
            id={`project_${date.toISOString()}`}
            title={formatDate(date)}
            placeholder="Project Name"
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
