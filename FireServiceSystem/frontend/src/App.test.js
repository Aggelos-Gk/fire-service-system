import { render, screen } from "@testing-library/react";

jest.mock(
  "react-router-dom",
  () => ({
    BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
    Routes: ({ children }) => <div data-testid="routes">{children}</div>,
    Route: () => null,
    Navigate: () => null,
    Outlet: () => null
  }),
  { virtual: true }
);

import App from "./App";

test("renders app shell", () => {
  render(<App />);
  expect(screen.getByTestId("router")).toBeInTheDocument();
  expect(screen.getByTestId("routes")).toBeInTheDocument();
});
