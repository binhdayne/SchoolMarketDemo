import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login form', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /đăng nhập/i })).toBeInTheDocument();
});
