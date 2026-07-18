import type { StoryObj, Meta } from '@storybook/react';
import { ClayButton } from './clay-button';

const meta: Meta<typeof ClayButton> = {
  title: 'Clay/ClayButton',
  component: ClayButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ClayButton>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: 'Delete',
    variant: 'danger',
  },
};

export const Loading: Story = {
  args: {
    children: 'Saving…',
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};
