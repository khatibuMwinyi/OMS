"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  findLegacyRecordByField,
  getLegacyCategoryOptions,
  getLegacyCodeOptions,
  getLegacyDescriptionOptions,
  getLegacyTypeOptions,
  type LegacySelectionRecord,
} from "@/lib/legacy-form-data";

type LegacySelectionFieldsProps = {
  records: LegacySelectionRecord[];
  defaultType?: string;
  defaultCategory?: string;
  defaultCode?: string;
  defaultDescription?: string;
  showAmount?: boolean;
};

export function LegacySelectionFields({
  records,
  defaultType,
  defaultCategory,
  defaultCode,
  defaultDescription,
  showAmount = true,
}: LegacySelectionFieldsProps) {
  const initialSelection = useMemo(() => {
    const directMatch =
      (defaultCode && findLegacyRecordByField(records, "code", defaultCode)) ||
      (defaultDescription &&
        findLegacyRecordByField(records, "description", defaultDescription)) ||
      (defaultCategory &&
        findLegacyRecordByField(records, "category", defaultCategory)) ||
      null;

    return {
      type:
        defaultType ??
        directMatch?.type ??
        getLegacyTypeOptions(records)[0] ??
        "",
      category: defaultCategory ?? directMatch?.category ?? "",
      code: defaultCode ?? directMatch?.code ?? "",
      description: defaultDescription ?? directMatch?.description ?? "",
    };
  }, [defaultCategory, defaultCode, defaultDescription, defaultType, records]);

  const [selectedType, setSelectedType] = useState(initialSelection.type);
  const [selectedCategory, setSelectedCategory] = useState(
    initialSelection.category,
  );
  const [selectedCode, setSelectedCode] = useState(initialSelection.code);
  const [selectedDescription, setSelectedDescription] = useState(
    initialSelection.description,
  );

  const typeOptions = useMemo(() => getLegacyTypeOptions(records), [records]);
  const categoryOptions = useMemo(
    () => getLegacyCategoryOptions(records, selectedType),
    [records, selectedType],
  );
  const codeOptions = useMemo(
    () => getLegacyCodeOptions(records, selectedType, selectedCategory),
    [records, selectedCategory, selectedType],
  );
  const descriptionOptions = useMemo(
    () => getLegacyDescriptionOptions(records, selectedType, selectedCategory),
    [records, selectedCategory, selectedType],
  );

  return (
    <>
      <label className="space-y-2">
        <span className="field-label">Type</span>
        <Select
          name="type"
          value={selectedType}
          onChange={(event) => {
            const nextType = event.target.value;
            setSelectedType(nextType);
            setSelectedCategory("");
            setSelectedCode("");
            setSelectedDescription("");
          }}
        >
          <option value="">Select type</option>
          {typeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </label>

      <label className="space-y-2">
        <span className="field-label">Category</span>
        <Select
          name="category"
          required
          value={selectedCategory}
          onChange={(event) => {
            const nextCategory = event.target.value;
            setSelectedCategory(nextCategory);
            setSelectedCode("");
            setSelectedDescription("");
          }}
        >
          <option value="">Select category</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </label>

      <label className="space-y-2">
        <span className="field-label">Description</span>
        <Select
          name="description"
          required
          disabled={!selectedCategory}
          value={selectedDescription}
          onChange={(event) => {
            const nextDescription = event.target.value;
            setSelectedDescription(nextDescription);

            const selectedRecord =
              findLegacyRecordByField(
                records,
                "description",
                nextDescription,
              ) ?? null;

            if (selectedRecord) {
              setSelectedType(selectedRecord.type);
              setSelectedCategory(selectedRecord.category);
              setSelectedCode(selectedRecord.code);
            } else {
              setSelectedCode("");
            }
          }}
        >
          <option value="">Select description</option>
          {descriptionOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </label>

      <label className="space-y-2">
        <span className="field-label">Code</span>
        <Select
          name="code"
          required
          disabled={!selectedCategory}
          value={selectedCode}
          onChange={(event) => {
            const nextCode = event.target.value;
            setSelectedCode(nextCode);

            const selectedRecord =
              findLegacyRecordByField(records, "code", nextCode) ?? null;

            if (selectedRecord) {
              setSelectedType(selectedRecord.type);
              setSelectedCategory(selectedRecord.category);
              setSelectedDescription(selectedRecord.description);
            } else {
              setSelectedDescription("");
            }
          }}
        >
          <option value="">Select code</option>
          {codeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </label>

      {showAmount ? (
        <label className="space-y-2 md:col-span-2">
          <span className="field-label">Amount</span>
          <Input name="amount" type="number" step="0.01" required />
        </label>
      ) : null}
    </>
  );
}
