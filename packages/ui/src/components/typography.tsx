import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "../lib/utils";

const typographyVariantClasses = {
  display:
    "text-balance font-semibold text-[2.5rem] leading-[1.2] sm:text-[3.5rem] sm:leading-[1.14]",
  heading1:
    "scroll-m-20 text-balance font-semibold text-[2.375rem] leading-[1.21] sm:text-5xl sm:leading-[1.17]",
  heading2:
    "scroll-m-20 text-balance font-semibold text-4xl leading-[1.22] sm:text-[2.5rem] sm:leading-[1.2]",
  heading3: "scroll-m-20 text-balance font-semibold text-[2rem] leading-[1.25]",
  heading4: "scroll-m-20 text-balance font-semibold text-[1.75rem] leading-[1.29]",
  heading5: "scroll-m-20 text-balance font-semibold text-2xl leading-[1.33]",
  heading6: "scroll-m-20 text-balance font-semibold text-xl leading-[1.4]",
  subheading: "text-pretty font-normal text-xl leading-[1.4]",
  bodyMedium: "text-base leading-6",
  bodyMediumSemibold: "font-semibold text-base leading-6",
  bodySmall: "text-sm leading-5",
  bodySmallSemibold: "font-semibold text-sm leading-5",
  bodyExtraSmall: "text-xs leading-4",
  bodyExtraSmallSemibold: "font-semibold text-xs leading-4",
  buttonMedium: "font-medium text-base leading-6",
  buttonSmall: "font-medium text-sm leading-5",
  labelMedium: "text-base leading-6",
  labelMediumMedium: "font-medium text-base leading-6",
  labelSmall: "text-sm leading-5",
  labelSmallMedium: "font-medium text-sm leading-5",
  labelExtraSmall: "text-xs leading-4",
  labelExtraSmallMedium: "font-medium text-xs leading-4",
  labelTiny: "text-[0.625rem] leading-4",
  labelTinyMedium: "font-medium text-[0.625rem] leading-4",
  linkMedium: "font-medium text-base leading-6 text-primary underline-offset-4 hover:underline",
  linkSmall: "font-medium text-sm leading-5 text-primary underline-offset-4 hover:underline",
  linkExtraSmall: "font-medium text-xs leading-4 text-primary underline-offset-4 hover:underline",
  uppercase: "font-medium text-sm leading-5 uppercase",

  // Legacy aliases retained for current consumers.
  h1: "scroll-m-20 text-balance font-semibold text-[2.375rem] leading-[1.21] sm:text-5xl sm:leading-[1.17]",
  h2: "scroll-m-20 text-balance font-semibold text-4xl leading-[1.22] sm:text-[2.5rem] sm:leading-[1.2]",
  h3: "scroll-m-20 text-balance font-semibold text-[2rem] leading-[1.25]",
  h4: "scroll-m-20 text-balance font-semibold text-[1.75rem] leading-[1.29]",
  p: "text-base leading-6",
  proseP: "text-base leading-6 [&:not(:first-child)]:mt-6",
  lead: "text-pretty text-muted-foreground text-xl leading-[1.4]",
  large: "font-semibold text-lg leading-7",
  small: "font-medium text-sm leading-none",
  muted: "text-muted-foreground text-sm leading-5",
  blockquote: "mt-6 border-l-2 pl-6 text-muted-foreground italic",
  code: "relative rounded-sm border border-border/70 bg-secondary px-1.5 py-0.5 font-mono text-sm",
  link: "font-medium text-primary underline-offset-4 hover:underline",
  list: "my-6 ml-6 list-disc [&>li]:mt-2",
} as const;

type TypographyVariant = keyof typeof typographyVariantClasses;
type TypographyElement = keyof React.JSX.IntrinsicElements;

const typographyVariants = cva("text-foreground tracking-normal", {
  variants: {
    variant: typographyVariantClasses,
  },
  defaultVariants: {
    variant: "bodyMedium",
  },
});

const variantToElementMap = {
  display: "span",
  heading1: "h1",
  heading2: "h2",
  heading3: "h3",
  heading4: "h4",
  heading5: "h5",
  heading6: "h6",
  subheading: "h6",
  bodyMedium: "p",
  bodyMediumSemibold: "span",
  bodySmall: "p",
  bodySmallSemibold: "span",
  bodyExtraSmall: "span",
  bodyExtraSmallSemibold: "span",
  buttonMedium: "span",
  buttonSmall: "span",
  labelMedium: "span",
  labelMediumMedium: "span",
  labelSmall: "span",
  labelSmallMedium: "span",
  labelExtraSmall: "span",
  labelExtraSmallMedium: "span",
  labelTiny: "span",
  labelTinyMedium: "span",
  linkMedium: "span",
  linkSmall: "span",
  linkExtraSmall: "span",
  uppercase: "span",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  p: "p",
  proseP: "p",
  lead: "p",
  large: "div",
  small: "small",
  muted: "p",
  blockquote: "blockquote",
  code: "code",
  link: "a",
  list: "ul",
} as const satisfies Record<TypographyVariant, TypographyElement>;

type TypographyOwnProps<TElement extends TypographyElement> = {
  as?: TElement;
  asChild?: boolean;
  className?: string;
  variant?: TypographyVariant;
};

type TypographyProps<TElement extends TypographyElement = "p"> = TypographyOwnProps<TElement> &
  Omit<React.ComponentPropsWithoutRef<TElement>, keyof TypographyOwnProps<TElement>>;

function Typography<TElement extends TypographyElement = "p">({
  as,
  asChild = false,
  className,
  variant = "bodyMedium",
  ...props
}: TypographyProps<TElement>) {
  const Comp: React.ElementType = asChild ? Slot.Root : (as ?? variantToElementMap[variant]);

  return (
    <Comp
      data-slot="typography"
      data-variant={variant}
      className={cn(typographyVariants({ variant }), className)}
      {...props}
    />
  );
}

type TypographyElementProps<TElement extends TypographyElement> = Omit<
  TypographyProps<TElement>,
  "as" | "variant"
>;

function TypographyH1(props: TypographyElementProps<"h1">) {
  return <Typography as="h1" variant="heading1" {...props} />;
}

function TypographyH2(props: TypographyElementProps<"h2">) {
  return <Typography as="h2" variant="heading2" {...props} />;
}

function TypographyH3(props: TypographyElementProps<"h3">) {
  return <Typography as="h3" variant="heading3" {...props} />;
}

function TypographyH4(props: TypographyElementProps<"h4">) {
  return <Typography as="h4" variant="heading4" {...props} />;
}

function TypographyP(props: TypographyElementProps<"p">) {
  return <Typography as="p" variant="bodyMedium" {...props} />;
}

function TypographyProseP(props: TypographyElementProps<"p">) {
  return <Typography as="p" variant="proseP" {...props} />;
}

function TypographyLead(props: TypographyElementProps<"p">) {
  return <Typography as="p" variant="subheading" {...props} />;
}

function TypographyLarge(props: TypographyElementProps<"div">) {
  return <Typography as="div" variant="bodyMediumSemibold" {...props} />;
}

function TypographySmall(props: TypographyElementProps<"small">) {
  return <Typography as="small" variant="labelSmallMedium" {...props} />;
}

function TypographyMuted(props: TypographyElementProps<"p">) {
  return <Typography as="p" variant="muted" {...props} />;
}

function TypographyBlockquote(props: TypographyElementProps<"blockquote">) {
  return <Typography as="blockquote" variant="blockquote" {...props} />;
}

function TypographyCode(props: TypographyElementProps<"code">) {
  return <Typography as="code" variant="code" {...props} />;
}

function TypographyLink(props: TypographyElementProps<"a">) {
  return <Typography as="a" variant="link" {...props} />;
}

function TypographyList(props: TypographyElementProps<"ul">) {
  return <Typography as="ul" variant="list" {...props} />;
}

export type { TypographyElement, TypographyProps, TypographyVariant };
export {
  Typography,
  TypographyBlockquote,
  TypographyCode,
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyLarge,
  TypographyLead,
  TypographyLink,
  TypographyList,
  TypographyMuted,
  TypographyP,
  TypographyProseP,
  TypographySmall,
  typographyVariants,
  variantToElementMap,
};
