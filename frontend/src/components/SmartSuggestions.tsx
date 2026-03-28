import React, { useEffect, useState } from "react";
import { PrioritySuggestion } from "../types";
import { getSuggestions, updateTask } from "../services/api";

interface Props {
  refreshKey?: number;
}

const SmartSuggestions: React.FC<Props> = ({ refreshKey }) => {
  const [suggestions, setSuggestions] = useState<PrioritySuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const data = await getSuggestions();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuggestions();
  }, [refreshKey]);

  const applySuggestion = async (s: PrioritySuggestion) => {
    await updateTask(s.task_id, { priority: s.suggested_priority });
    setSuggestions((prev) => prev.filter((x) => x.task_id !== s.task_id));
  };

  if (loading) return <p className="text-sm text-gray-400">Loading suggestions...</p>;
  if (suggestions.length === 0) return <p className="text-sm text-gray-400">No suggestions right now.</p>;

  return (
    <div className="space-y-3">
      {suggestions.map((s) => (
        <div
          key={s.task_id}
          className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between"
        >
          <div>
            <p className="font-medium text-sm">{s.task_name}</p>
            <p className="text-xs text-gray-500">
              {s.current_priority} &rarr; {s.suggested_priority} &mdash; {s.reason}
            </p>
          </div>
          <button
            onClick={() => applySuggestion(s)}
            className="text-xs px-3 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
          >
            Apply
          </button>
        </div>
      ))}
    </div>
  );
};

export default SmartSuggestions;
