import mongoose, { Schema, Document, Model } from 'mongoose';
import { LLMIssue } from '../types';

export interface IReview extends Document {
  prUrl: string;
  repoFullName: string;
  prNumber: number;
  prTitle: string;
  headSha: string;
  reviewedAt: Date;
  issues: LLMIssue[];
  summary: string;
  estimatedRisk: 'low' | 'medium' | 'high';
  positives: string[];
  inputTokens: number;
  outputTokens: number;
  processingMs: number;
  truncated: boolean;
  truncatedFileCount: number;
  status: 'success' | 'failed' | 'no_changes';
  errorMessage?: string;
}

const IssueSchema = new Schema<LLMIssue>(
  {
    file: { type: String, required: true },
    line: { type: Number, default: null },
    severity: { type: String, enum: ['critical', 'warning', 'suggestion'], required: true },
    category: {
      type: String,
      enum: ['bug', 'security', 'style', 'performance', 'logic', 'documentation'],
      required: true,
    },
    comment: { type: String, required: true },
  },
  { _id: false },
);

const ReviewSchema = new Schema<IReview>(
  {
    prUrl: { type: String, required: true },
    repoFullName: { type: String, required: true, index: true },
    prNumber: { type: Number, required: true },
    prTitle: { type: String, required: true },
    headSha: { type: String, required: true },
    reviewedAt: { type: Date, default: Date.now, index: true },
    issues: { type: [IssueSchema], default: [] },
    summary: { type: String, default: '' },
    estimatedRisk: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    positives: { type: [String], default: [] },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    processingMs: { type: Number, default: 0 },
    truncated: { type: Boolean, default: false },
    truncatedFileCount: { type: Number, default: 0 },
    status: { type: String, enum: ['success', 'failed', 'no_changes'], required: true },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound index to enforce idempotency: one review per PR head commit
ReviewSchema.index({ repoFullName: 1, prNumber: 1, headSha: 1 }, { unique: true });

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
