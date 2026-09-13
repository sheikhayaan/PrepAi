import React, { useState } from 'react';
import { Star, MessageSquare, CheckCircle, X, Sparkles } from 'lucide-react';
import api from '../api/client';

export default function RatingModal({ isOpen, onClose, sessionId, featureUsed = 'interview_session', onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [categories, setCategories] = useState({
    ai_voice_quality: 5,
    question_depth: 5,
    scoring_accuracy: 5,
    latency_speed: 5
  });
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleCategoryChange = (key, val) => {
    setCategories(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/ratings', {
        rating,
        feedback,
        featureUsed,
        categories,
        sessionId: sessionId || undefined
      });
      setSubmitted(true);
      if (onSubmitted) onSubmitted();
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-surface border border-hairline/80 rounded-2xl shadow-2xl p-6 md:p-8 overflow-hidden">
        {/* Glow backdrop accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-hover transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-bold text-white">Thank You for Your Feedback!</h3>
            <p className="text-sm text-text-secondary max-w-xs">
              Your insights help us calibrate the AI interviewer algorithms and refine question precision.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Rate Your Experience</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">How was this AI session?</h3>
              <p className="text-xs text-text-muted">Help us build the most realistic FAANG mock interview platform.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/40 rounded-xl text-red-300 text-xs text-center">
                {error}
              </div>
            )}

            {/* Overall Star Rating */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = (hoverRating || rating) >= star;
                  return (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110 cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          filled
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                            : 'text-text-muted/40 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-medium text-text-secondary">
                {rating === 5 && '🌟 Outstanding & Realistic'}
                {rating === 4 && '👍 Very Good / Helpful'}
                {rating === 3 && '😐 Average Experience'}
                {rating === 2 && '👎 Needs Improvement'}
                {rating === 1 && '⚠️ Poor Experience'}
              </span>
            </div>

            {/* Category Ratings Breakdown */}
            <div className="bg-bg/60 border border-hairline/60 rounded-xl p-4 space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Detailed Evaluation
              </div>

              {[
                { id: 'ai_voice_quality', label: 'AI Voice & Delivery' },
                { id: 'question_depth', label: 'Question Depth & FAANG Realism' },
                { id: 'scoring_accuracy', label: 'Feedback & Score Precision' },
                { id: 'latency_speed', label: 'Speed & Responsiveness' }
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{item.label}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => handleCategoryChange(item.id, val)}
                        className={`w-6 h-6 rounded-md text-[10px] font-semibold transition-all ${
                          categories[item.id] >= val
                            ? 'bg-accent/20 border border-accent text-accent font-bold'
                            : 'bg-surface border border-hairline text-text-muted hover:border-text-secondary'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Written Feedback Textarea */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <MessageSquare className="w-3.5 h-3.5 text-accent" />
                <span>Suggestions / Comments (Optional)</span>
              </label>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What went well? Any questions felt unrealistic or grading was off?"
                className="w-full bg-bg/80 border border-hairline/80 focus:border-accent rounded-xl p-3 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary-glow px-6 py-2.5 rounded-xl text-xs font-semibold text-white tracking-wide flex items-center gap-2 cursor-pointer shadow-lg shadow-accent/20"
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
