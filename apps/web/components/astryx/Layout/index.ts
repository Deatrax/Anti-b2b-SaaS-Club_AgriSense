// Copyright (c) Meta Platforms, Inc. and affiliates.

'use client';

/**
 * @file index.ts
 * @input Imports layout utilities and components
 * @output Exports Astryx layout system
 * @position Entry point for @astryxdesign/core/Layout
 *
 * SYNC: When modified, update /packages/core/src/Layout/Layout.doc.mjs
 */

// Container utility
export {container} from './container.stylex';
export type {
  ContainerComponent,
  ContainerOptions,
  SpacingToken,
} from './container.stylex';

// Edge compensation utility
export {edgeCompSlot, EDGE_COMP_ATTR} from './edgeCompensation.stylex';

// Stack utilities (re-exported from Stack module)
export {stack} from '@astryxdesign/core/Stack';
export type {
  StackOptions,
  StackDirection,
  StackCrossAlignment,
  StackMainAlignment,
  StackWrap,
  SpacingStep,
} from '@astryxdesign/core/Stack';

export {stackItem} from '@astryxdesign/core/Stack';
export type {
  StackItemOptions,
  StackItemCrossAlignSelf,
  StackItemSize,
} from '@astryxdesign/core/Stack';

// Stack components (re-exported from Stack module)
export {Stack, HStack, VStack, StackItem} from '@astryxdesign/core/Stack';
export type {
  StackProps,
  StackAlignment,
  HStackProps,
  VStackProps,
  StackItemProps,
} from '@astryxdesign/core/Stack';

// Container components (re-exported from their own modules)
export {Card} from '@astryxdesign/core/Card';
export type {CardProps} from '@astryxdesign/core/Card';

export {Section} from '@astryxdesign/core/Section';
export type {SectionProps, SectionVariant} from '@astryxdesign/core/Section';

export type {SizeValue} from '@astryxdesign/core/utils';

// Layout structure components
export {Layout} from './Layout';
export type {LayoutProps, LayoutHeight} from './Layout';

export {LayoutHeader} from './LayoutHeader';
export type {LayoutHeaderProps} from './LayoutHeader';

export {LayoutFooter} from './LayoutFooter';
export type {LayoutFooterProps} from './LayoutFooter';

export {LayoutContent} from './LayoutContent';
export type {LayoutContentProps} from './LayoutContent';

export {LayoutPanel} from './LayoutPanel';
export type {LayoutPanelProps} from './LayoutPanel';

export {LayoutAreaContext} from './LayoutAreaContext';
export type {LayoutArea} from './LayoutAreaContext';

export {LayoutDividerContext} from './LayoutDividerContext';
export type {LayoutDividerContextValue} from './LayoutDividerContext';
