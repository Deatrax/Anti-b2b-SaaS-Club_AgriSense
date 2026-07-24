// Copyright (c) Meta Platforms, Inc. and affiliates.

'use client';

/**
 * @file AlertDialog.tsx
 * @input Uses React, Dialog, Layout, Heading, Text, Button
 * @output Exports AlertDialog component, AlertDialogProps type
 * @position Core implementation; consumed by index.ts, tested by AlertDialog.test.tsx
 *
 * SYNC: When modified, update these files to stay in sync:
 * - /packages/core/src/AlertDialog/AlertDialog.doc.mjs (props table, features, examples)
 * - /packages/core/src/AlertDialog/AlertDialog.test.tsx (tests for new/changed behavior)
 * - /packages/core/src/AlertDialog/index.ts (exports if types change)
 * - /apps/storybook/stories/AlertDialog.stories.tsx (storybook stories)
 * - /packages/cli/templates/blocks/components/AlertDialog/ (showcase blocks)
 */

import React, {useId, useCallback} from 'react';
import {Dialog} from '@astryxdesign/core/Dialog';
import {Layout} from '@astryxdesign/core/Layout';
import {LayoutContent} from '@astryxdesign/core/Layout';
import {LayoutFooter} from '@astryxdesign/core/Layout';
import {HStack} from '@astryxdesign/core/Stack';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button, type ButtonVariant} from '@astryxdesign/core/Button';
import type {BaseProps} from '@astryxdesign/core/BaseProps';
import {mergeProps} from '@astryxdesign/core/utils';
import {themeProps} from '@astryxdesign/core/utils';
import {useTranslator} from '@astryxdesign/core/i18n';

export interface AlertDialogProps extends BaseProps<HTMLDialogElement> {
  ref?: React.Ref<HTMLDialogElement>;
  /**
   * Whether the dialog is open.
   */
  isOpen: boolean;

  /**
   * Renders alert dialog content inline without modal behavior.
   * For documentation previews and showcases only.
   * @default false
   */
  isInline?: boolean;

  /**
   * Callback fired when the dialog visibility changes.
   * Called with `false` when cancel is clicked or Escape is pressed.
   */
  onOpenChange: (isOpen: boolean) => unknown;

  /**
   * Dialog title. Linked to the dialog via `aria-labelledby`.
   */
  title: string;

  /**
   * Consequence description. Linked to the dialog via `aria-describedby`.
   */
  description: string;

  /**
   * Label for the cancel button. Rendered as a ghost Button.
   * Clicking cancel calls `onOpenChange(false)`.
   * @default 'Cancel'
   */
  cancelLabel?: string;

  /**
   * Label for the action button.
   */
  actionLabel: string;

  /**
   * Variant for the action button.
   * @default 'destructive'
   */
  actionVariant?: ButtonVariant;

  /**
   * Whether the action button shows a loading spinner.
   */
  isActionLoading?: boolean;

  /**
   * Callback fired when the action button is clicked.
   * The dialog does NOT auto-close — call `onOpenChange(false)` when done.
   */
  onAction: () => unknown;

  /**
   * The width of the dialog.
   * Numbers are treated as pixels, strings are used as-is.
   * @default 400
   */
  width?: number | string;
}

/**
 * A confirmation dialog for destructive or irreversible actions.
 *
 * Uses `role="alertdialog"` and requires explicit user action to dismiss.
 * Cannot be dismissed by clicking outside. Escape key triggers cancel.
 * Initial focus goes to the cancel button (least destructive action).
 *
 * @example
 * ```
 * <AlertDialog
 *   isOpen={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Delete item?"
 *   description="This action cannot be undone."
 *   actionLabel="Delete"
 *   onAction={async () => { await deleteItem(); setIsOpen(false); }}
 * />
 * ```
 */
export function AlertDialog({
  ref,
  isOpen,
  isInline,
  onOpenChange,
  title,
  description,
  cancelLabel: cancelLabelFromProps,
  actionLabel,
  actionVariant = 'destructive',
  isActionLoading,
  onAction,
  width = 400,
  xstyle,
  className,
  style,
  'data-testid': testId,
  ...rest
}: AlertDialogProps) {
  const t = useTranslator();
  const cancelLabel = cancelLabelFromProps ?? t('@astryx.alertDialog.cancel');
  const titleId = useId();
  const descriptionId = useId();

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog
      {...rest}
      ref={ref}
      isOpen={isOpen}
      isInline={isInline}
      onOpenChange={onOpenChange}
      width={width}
      purpose="form"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      {...mergeProps(themeProps('alert-dialog'), {className, style})}
      xstyle={xstyle}
      data-testid={testId}>
      <Layout
        content={
          <LayoutContent>
            <Heading level={2} id={titleId}>
              {title}
            </Heading>
            <Text type="body" color="secondary" id={descriptionId}>
              {description}
            </Text>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button
                variant="ghost"
                label={cancelLabel}
                onClick={handleCancel}
              />
              <Button
                variant={actionVariant}
                label={actionLabel}
                onClick={onAction}
                isLoading={isActionLoading}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}

AlertDialog.displayName = 'AlertDialog';
