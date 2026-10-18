import { LaserVariants, type LaserVariantsProps, type ThreeUILaserVariant } from "./LaserVariants";

export type LaserVariant = ThreeUILaserVariant;

export type LaserCollectionProps = LaserVariantsProps;

export function LaserCollection({ variant = "matrix-field", ...props }: LaserCollectionProps) {
  return <LaserVariants {...props} variant={variant} />;
}
