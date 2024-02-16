import React, { forwardRef, HTMLProps } from 'react';
import { styled } from '@superset-ui/core';
import Button from "../../../src/components/Button/index";

// ADDITIONAL CODE
// Dropdwon Wrapper
export const ControlSection = forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>(
  (props, ref) => (<div ref={ref} style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '10px', gap: '10px' }}>
    {props.children}
  </div>)
);

export const DropDownWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-bottom: 10px;
  gap: 10px;
`;// Explore button
interface RefreshButtonProps {
  onClick: () => void;
  disabled: boolean;
  label: string;
}
export const RefreshButton: React.FC<RefreshButtonProps> = ({ onClick, disabled, label }) => {
  const button = Button({
    tooltip: "Load Dataset",
    disabled: disabled,
    buttonSize: 'default',
    onClick: onClick,
    buttonStyle: "primary",
    children: label,
    style: { marginBottom: '10px' }
  });

  return button;
};

