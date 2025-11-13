import { z } from 'zod';

// Booking form validation
export const bookingSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  phone: z.string()
    .trim()
    .min(10, { message: "Phone number must be at least 10 digits" })
    .max(20, { message: "Phone number must be less than 20 digits" })
    .regex(/^[+]?[0-9\s-()]+$/, { message: "Invalid phone number format" }),
  notes: z.string()
    .max(1000, { message: "Notes must be less than 1000 characters" })
    .optional(),
});

// Contact form validation
export const contactSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  message: z.string()
    .trim()
    .min(10, { message: "Message must be at least 10 characters" })
    .max(2000, { message: "Message must be less than 2000 characters" }),
});

// Profile update validation
export const profileSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  phone: z.string()
    .trim()
    .min(10, { message: "Phone number must be at least 10 digits" })
    .max(20, { message: "Phone number must be less than 20 digits" })
    .regex(/^[+]?[0-9\s-()]+$/, { message: "Invalid phone number format" })
    .optional(),
});

// Chat message validation
export const chatMessageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "Message cannot be empty" })
    .max(2000, { message: "Message must be less than 2000 characters" }),
});

// Service creation validation (admin)
export const serviceSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "Service name must be at least 2 characters" })
    .max(100, { message: "Service name must be less than 100 characters" }),
  description: z.string()
    .trim()
    .min(10, { message: "Description must be at least 10 characters" })
    .max(500, { message: "Description must be less than 500 characters" }),
  price: z.number()
    .positive({ message: "Price must be a positive number" })
    .max(999999, { message: "Price must be less than 999,999" }),
  currency: z.string()
    .length(3, { message: "Currency must be a 3-letter code (e.g., USD, EGP)" }),
});

export type BookingFormData = z.infer<typeof bookingSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type ChatMessageData = z.infer<typeof chatMessageSchema>;
export type ServiceFormData = z.infer<typeof serviceSchema>;
