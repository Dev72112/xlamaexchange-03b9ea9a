import React, { useState, forwardRef, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus, Send, CheckCircle2, X, ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FEEDBACK_TYPES = [
  { value: "bug", label: "Bug Report", emoji: "🐛" },
  { value: "feature", label: "Feature Request", emoji: "✨" },
  { value: "improvement", label: "Improvement", emoji: "💡" },
  { value: "other", label: "Other", emoji: "💬" },
] as const;

const MAX_MESSAGE_LENGTH = 1000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const FloatingFeedback = forwardRef<HTMLDivElement>(function FloatingFeedback(_props, ref) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
    
    const { error } = await supabase.storage
      .from("feedback-screenshots")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("feedback-screenshots")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedMessage = message.trim();
    if (!feedbackType || !trimmedMessage) {
      toast.error("Please select a type and enter your feedback");
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message must be less than ${MAX_MESSAGE_LENGTH} characters`);
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl: string | null = null;

      if (screenshot) {
        setIsUploading(true);
        screenshotUrl = await uploadScreenshot(screenshot);
        setIsUploading(false);
        
        if (!screenshotUrl) {
          toast.error("Failed to upload screenshot");
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from("anonymous_feedback").insert({
        feedback_type: feedbackType,
        message: trimmedMessage,
        page_url: window.location.pathname,
        screenshot_url: screenshotUrl,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Thank you for your feedback!");

      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 2000);
    } catch (error) {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setFeedbackType("");
    setMessage("");
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div ref={ref} className="fixed bottom-4 right-4 z-50">
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
            aria-label="Send feedback"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="end" 
          className="w-80 p-0 bg-background border shadow-xl"
          sideOffset={12}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4 text-primary" />
                Quick Feedback
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {submitted ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="font-medium">Thank You!</p>
                <p className="text-sm text-muted-foreground">
                  Your feedback helps us improve.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="floating-feedback-type" className="text-xs">Type</Label>
                  <Select value={feedbackType} onValueChange={setFeedbackType}>
                    <SelectTrigger id="floating-feedback-type" className="h-9">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-[60]">
                      {FEEDBACK_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <span>{type.emoji}</span>
                            <span>{type.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label htmlFor="floating-message" className="text-xs">Message</Label>
                    <span className="text-xs text-muted-foreground">
                      {message.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  </div>
                  <Textarea
                    id="floating-message"
                    placeholder="Describe the issue or suggestion..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>

                {/* Screenshot upload */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Screenshot (optional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="floating-screenshot"
                  />
                  
                  {screenshotPreview ? (
                    <div className="relative">
                      <img
                        src={screenshotPreview}
                        alt="Screenshot preview"
                        className="w-full h-20 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={removeScreenshot}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 h-8"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      Add Screenshot
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  100% anonymous • No data collected
                </p>

                <Button
                  type="submit"
                  size="sm"
                  className="w-full gap-2"
                  disabled={isSubmitting || !feedbackType || !message.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {isUploading ? "Uploading..." : "Submitting..."}
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

FloatingFeedback.displayName = "FloatingFeedback";
