'use client';
import { motion } from "framer-motion";
import { ComponentProps } from "react";
export function MotionDiv(props: ComponentProps<typeof motion.div>) {
  return <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} {...props} />;
}
