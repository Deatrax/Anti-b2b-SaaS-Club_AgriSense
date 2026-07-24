// Copyright (c) Meta Platforms, Inc. and affiliates.

'use client';
import type React from 'react';
import type {ReactNode} from 'react';
import * as stylex from '@stylexjs/stylex';
import type {BaseProps} from '@astryxdesign/core/BaseProps';
import {mergeProps} from '@astryxdesign/core/utils';
import {themeProps} from '@astryxdesign/core/utils';

export interface TableFooterProps extends BaseProps<HTMLTableSectionElement> {
  ref?: React.Ref<HTMLTableSectionElement>;
  children: ReactNode;
}

export function TableFooter({
  ref,
  children,
  xstyle,
  className,
  style,
  ...rest
}: TableFooterProps) {
  return (
    <tfoot
      ref={ref}
      {...mergeProps(
        themeProps('table-footer'),
        stylex.props(xstyle),
        className,
        style,
      )}
      {...rest}>
      {children}
    </tfoot>
  );
}
TableFooter.displayName = 'TableFooter';
