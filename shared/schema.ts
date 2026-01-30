
import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === VM STATE ===
// We only support one active VM for this demo to keep it simple/stable
export const vms = pgTable("vms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("My VM"),
  status: text("status").notNull().default("stopped"), // stopped, running, error
  imagePath: text("image_path"), // Path to the uploaded .bin/.iso
  vncPort: integer("vnc_port"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVmSchema = createInsertSchema(vms).omit({ id: true, createdAt: true });

export type Vm = typeof vms.$inferSelect;
export type InsertVm = z.infer<typeof insertVmSchema>;

// API Types
export type VmStatusResponse = Vm;
export type UploadResponse = { success: boolean; path: string; filename: string };
