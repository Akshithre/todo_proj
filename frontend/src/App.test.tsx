import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import Navbar from "./components/Navbar";
import TaskCard from "./components/TaskCard";

test("renders navbar with all links", () => {
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );
  expect(screen.getByText("Dashboard")).toBeInTheDocument();
  expect(screen.getByText("Add Task")).toBeInTheDocument();
  expect(screen.getByText("Tasks")).toBeInTheDocument();
  expect(screen.getByText("Analytics")).toBeInTheDocument();
});

test("renders task card with name and priority", () => {
  const task = {
    task_id: 1,
    task_name: "Test task",
    priority: "High",
    deadline: null,
    estimated_time: 2,
    actual_time: null,
    status: "Pending",
    category: "Dev",
    created_at: "2024-01-01T00:00:00",
  };
  render(
    <TaskCard task={task} onComplete={jest.fn()} onDelete={jest.fn()} />
  );
  expect(screen.getByText("Test task")).toBeInTheDocument();
  expect(screen.getByText("High")).toBeInTheDocument();
  expect(screen.getByText("Complete")).toBeInTheDocument();
  expect(screen.getByText("Delete")).toBeInTheDocument();
});

test("completed task shows no complete button", () => {
  const task = {
    task_id: 2,
    task_name: "Done task",
    priority: "Low",
    deadline: null,
    estimated_time: null,
    actual_time: 1,
    status: "Completed",
    category: null,
    created_at: "2024-01-01T00:00:00",
  };
  render(
    <TaskCard task={task} onComplete={jest.fn()} onDelete={jest.fn()} />
  );
  expect(screen.queryByText("Complete")).not.toBeInTheDocument();
  expect(screen.getByText("Delete")).toBeInTheDocument();
});
