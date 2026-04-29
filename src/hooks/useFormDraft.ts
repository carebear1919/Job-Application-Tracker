import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface FormDraftState<T> {
  jobForm: T;
  sourceInput: string;
  skillInput: string;
  editingContactIndex: number | null;
}

const FORM_DRAFT_KEY = 'job_form_draft';
const DRAFT_DEBOUNCE_MS = 500;

export function useFormDraft<T>(initialJobForm: T, initialSourceInput = '', initialSkillInput = '') {
  const [jobForm, setJobForm] = useState<T>(initialJobForm);
  const [sourceInput, setSourceInput] = useState(initialSourceInput);
  const [skillInput, setSkillInput] = useState(initialSkillInput);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  
  const [draft, setDraft] = useLocalStorage<FormDraftState<T> | null>(FORM_DRAFT_KEY, null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const hasDraftLoaded = useRef(false);

  // Load draft on mount
  useEffect(() => {
    if (draft && !hasDraftLoaded.current) {
      hasDraftLoaded.current = true;
      setJobForm(draft.jobForm);
      setSourceInput(draft.sourceInput);
      setSkillInput(draft.skillInput);
      setEditingContactIndex(draft.editingContactIndex);
    }
  }, [draft]);

  // Save form state to draft with debouncing
  const saveFormDraft = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      const draftState: FormDraftState<T> = {
        jobForm,
        sourceInput,
        skillInput,
        editingContactIndex,
      };
      setDraft(draftState);
    }, DRAFT_DEBOUNCE_MS);
  }, [jobForm, sourceInput, skillInput, editingContactIndex, setDraft]);

  // Auto-save draft whenever form state changes
  useEffect(() => {
    saveFormDraft();
  }, [jobForm, sourceInput, skillInput, editingContactIndex, saveFormDraft]);

  // Clear draft when form is submitted (called by parent)
  const clearDraft = useCallback(() => {
    setDraft(null);
  }, [setDraft]);

  return {
    jobForm,
    setJobForm,
    sourceInput,
    setSourceInput,
    skillInput,
    setSkillInput,
    editingContactIndex,
    setEditingContactIndex,
    clearDraft,
  };
}
