Train both ML models. Reads from Azure Blob Storage if available, otherwise uses synthetic data.

```bash
cd ml && python train_priority_model.py && python train_completion_model.py
```

This produces `priority_model.pkl` and `completion_model.pkl` in the `ml/` directory. The backend loads these at startup for predictions.
