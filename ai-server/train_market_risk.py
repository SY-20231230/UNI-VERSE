from __future__ import annotations

import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn import __version__ as sklearn_version
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GroupKFold, GroupShuffleSplit

import build_dataset as bd
from market_risk_guard import build_model_text, rule_check

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
MODEL_DIR = ROOT / "models"
REPORT_DIR = ROOT / "reports"
for d in (DATA_DIR, MODEL_DIR, REPORT_DIR):
    d.mkdir(exist_ok=True)

SEED = 42
warnings.filterwarnings("ignore")


def make_vectorizer() -> TfidfVectorizer:
    return TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(2, 4),
        min_df=2,
        max_df=0.95,
        sublinear_tf=True,
    )


def evaluate(model, vectorizer, data: pd.DataFrame, threshold: float) -> tuple[pd.DataFrame, dict]:
    x = vectorizer.transform(data["model_text"])
    probs = model.predict_proba(x)[:, 1]
    rules = np.array([bool(rule_check(t)) for t in data["text"]])
    out = data.copy()
    out["prob"] = probs
    out["rule_hit"] = rules
    out["pred_model"] = (probs >= threshold).astype(int)
    out["pred"] = ((probs >= threshold) | rules).astype(int)

    scores = {}
    for col, label in [("pred_model", "모델만"), ("pred", "모델+규칙")]:
        scores[label] = {
            "precision": precision_score(out.label, out[col], zero_division=0),
            "recall": recall_score(out.label, out[col], zero_division=0),
            "f1": f1_score(out.label, out[col], zero_division=0),
            "accuracy": float((out.label == out[col]).mean()),
        }
    return out, scores


def main() -> None:
    # 1) 최신 데이터 재생성
    df = bd.generate()
    bd.write_hard_cases()
    data_path = DATA_DIR / "market_dataset.csv"
    df.to_csv(data_path, index=False, encoding="utf-8-sig")
    hard = pd.read_csv(DATA_DIR / "hard_cases.csv")

    # 하드케이스와 정확히 같은 문장은 학습에서 제외
    df = df[~df["text"].isin(set(hard["text"]))].reset_index(drop=True)
    df["model_text"] = df["text"].map(build_model_text)
    hard["model_text"] = hard["text"].map(build_model_text)

    # 2) 문장 틀(group) 단위 train/test 분리
    gss = GroupShuffleSplit(n_splits=1, test_size=0.15, random_state=SEED)
    train_idx, test_idx = next(gss.split(df, df["label"], df["group"]))
    train_df = df.iloc[train_idx].reset_index(drop=True)
    test_df = df.iloc[test_idx].reset_index(drop=True)

    # 3) 5-fold OOF로 C 비교
    folds = list(GroupKFold(n_splits=5).split(train_df, train_df["label"], train_df["group"]))
    candidates: list[tuple[float, float, np.ndarray]] = []
    for c in (1.0, 4.0, 10.0):
        oof = np.zeros(len(train_df))
        for tr, va in folds:
            vec = make_vectorizer()
            x_tr = vec.fit_transform(train_df["model_text"].iloc[tr])
            clf = LogisticRegression(max_iter=2000, class_weight="balanced", C=c, random_state=SEED)
            clf.fit(x_tr, train_df["label"].iloc[tr])
            oof[va] = clf.predict_proba(vec.transform(train_df["model_text"].iloc[va]))[:, 1]
        f1 = f1_score(train_df.label, (oof >= 0.5).astype(int))
        candidates.append((f1, c, oof))

    _, best_c, best_oof = max(candidates, key=lambda x: x[0])

    # 4) OOF 기반 threshold 최적화
    prec, rec, thr = precision_recall_curve(train_df.label, best_oof)
    cand = pd.DataFrame({"threshold": thr, "precision": prec[:-1], "recall": rec[:-1]})
    cand["f1"] = 2 * cand.precision * cand.recall / (cand.precision + cand.recall + 1e-9)
    threshold = round(float(cand.sort_values(["f1", "threshold"], ascending=[False, True]).iloc[0]["threshold"]), 3)

    # 5) train split 모델로 test/hard 평가
    eval_vec = make_vectorizer()
    x_train = eval_vec.fit_transform(train_df["model_text"])
    eval_model = LogisticRegression(max_iter=2000, class_weight="balanced", C=best_c, random_state=SEED)
    eval_model.fit(x_train, train_df["label"])

    test_out, test_scores = evaluate(eval_model, eval_vec, test_df, threshold)
    hard_out, hard_scores = evaluate(eval_model, eval_vec, hard, threshold)

    # 6) 전체 데이터로 최종 학습
    final_vec = make_vectorizer()
    x_all = final_vec.fit_transform(df["model_text"])
    final_model = LogisticRegression(max_iter=2000, class_weight="balanced", C=best_c, random_state=SEED)
    final_model.fit(x_all, df["label"])

    block_df = df[df.label == 1]
    final_cat = LogisticRegression(max_iter=3000, class_weight="balanced", C=best_c, random_state=SEED)
    final_cat.fit(final_vec.transform(block_df["model_text"]), block_df["category"])

    joblib.dump(final_vec, MODEL_DIR / "tfidf_vectorizer.pkl")
    joblib.dump(final_model, MODEL_DIR / "fraud_classifier.pkl")
    joblib.dump(final_cat, MODEL_DIR / "category_classifier.pkl")

    config = {
        "purpose": "market_listing_risk_filter",
        "input": "title + description",
        "threshold": threshold,
        "features": "char_wb_2_4",
        "C": best_c,
        "n_train_rows": int(len(df)),
        "sklearn_version": sklearn_version,
        "test_scores": {k: {m: round(float(v), 4) for m, v in d.items()} for k, d in test_scores.items()},
        "hard_scores": {k: {m: round(float(v), 4) for m, v in d.items()} for k, d in hard_scores.items()},
    }
    (MODEL_DIR / "config.json").write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")

    errors = pd.concat([test_out.assign(split="test"), hard_out.assign(split="hard")])
    errors = errors[errors.pred != errors.label].copy()
    errors["error_type"] = np.where(errors.label == 1, "FN", "FP")
    errors[["split", "error_type", "text", "label", "category", "prob", "rule_hit"]].to_csv(
        REPORT_DIR / "errors.csv", index=False, encoding="utf-8-sig"
    )

    print("=== UNI:VERSE Market Risk model trained ===")
    print(f"train rows       : {len(df)}")
    print(f"best C           : {best_c}")
    print(f"threshold        : {threshold}")
    print(f"sklearn          : {sklearn_version}")
    print(f"test accuracy    : {test_scores['모델+규칙']['accuracy']:.4f}")
    print(f"test F1          : {test_scores['모델+규칙']['f1']:.4f}")
    print(f"hard accuracy    : {hard_scores['모델+규칙']['accuracy']:.4f}")
    print(f"hard F1          : {hard_scores['모델+규칙']['f1']:.4f}")
    print(f"confusion matrix :\n{confusion_matrix(test_out.label, test_out.pred)}")
    print(f"saved models     : {MODEL_DIR}")


if __name__ == "__main__":
    main()
