import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "../lib/utils";

const typographyVariants = cva("text-foreground tracking-normal", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-balance font-semibold text-4xl leading-tight md:text-6xl",
      h2: "scroll-m-20 border-b pb-3 font-semibold text-3xl leading-tight first:mt-0",
      h3: "scroll-m-20 font-semibold text-2xl leading-snug",
      h4: "scroll-m-20 font-semibold text-xl leading-snug",
      p: "leading-7",
      proseP: "leading-7 [&:not(:first-child)]:mt-6",
      lead: "text-muted-foreground text-xl leading-8",
      large: "font-semibold text-lg",
      small: "font-medium text-sm leading-none",
      muted: "text-muted-foreground text-sm",
      blockquote: "mt-6 border-l-2 pl-6 text-muted-foreground italic",
      code: "relative rounded-sm border border-border/70 bg-secondary px-1.5 py-0.5 font-mono text-sm",
      link: "font-medium text-primary underline-offset-4 hover:underline",
      list: "my-6 ml-6 list-disc [&>li]:mt-2",
    },
  },
  defaultVariants: {
    variant: "p",
  },
});

type TypographyVariant = NonNullable<VariantProps<typeof typographyVariants>["variant"]>;
type TypographyElement = keyof React.JSX.IntrinsicElements;

const defaultElementByVariant = {
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
} as const;

const variantByElement: Partial<Record<TypographyElement, TypographyVariant>> = {
  a: "link",
  blockquote: "blockquote",
  code: "code",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  ol: "list",
  p: "p",
  small: "small",
  ul: "list",
};

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
  variant,
  ...props
}: TypographyProps<TElement>) {
  const resolvedVariant = variant ?? (as ? variantByElement[as] : undefined) ?? "p";
  const Comp: React.ElementType = asChild
    ? Slot.Root
    : (as ?? defaultElementByVariant[resolvedVariant]);

  return (
    <Comp
      data-slot="typography"
      data-variant={resolvedVariant}
      className={cn(typographyVariants({ variant: resolvedVariant }), className)}
      {...props}
    />
  );
}

type TypographyElementProps<TElement extends TypographyElement> = Omit<
  TypographyProps<TElement>,
  "as" | "variant"
>;

function TypographyH1(props: TypographyElementProps<"h1">) {
  return <Typography as="h1" variant="h1" {...props} />;
}

function TypographyH2(props: TypographyElementProps<"h2">) {
  return <Typography as="h2" variant="h2" {...props} />;
}

function TypographyH3(props: TypographyElementProps<"h3">) {
  return <Typography as="h3" variant="h3" {...props} />;
}

function TypographyH4(props: TypographyElementProps<"h4">) {
  return <Typography as="h4" variant="h4" {...props} />;
}

function TypographyP(props: TypographyElementProps<"p">) {
  return <Typography as="p" variant="p" {...props} />;
}

function TypographyProseP(props: TypographyElementProps<"p">) {
  return <Typography as="p" variant="proseP" {...props} />;
}

function TypographyLead(props: TypographyElementProps<"p">) {
  return <Typography as="p" variant="lead" {...props} />;
}

function TypographyLarge(props: TypographyElementProps<"div">) {
  return <Typography as="div" variant="large" {...props} />;
}

function TypographySmall(props: TypographyElementProps<"small">) {
  return <Typography as="small" variant="small" {...props} />;
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
};
