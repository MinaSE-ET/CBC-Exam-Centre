import { v4 as uuidv4 } from "uuid";

// This file is now just a compatibility layer for any code still using these utilities
// The actual database operations are now handled by the Node.js backend with Prisma

const baseURL = 'http://localhost:8000/api';
console.log("Using backend API instead of SQLite mock database");

export function generateId(): string {
  return uuidv4();
}

export function jsonToString(data: any): string {
  return JSON.stringify(data);
}

export function stringToJson(data: string): any {
  return JSON.parse(data);
}

// Export mock objects for backward compatibility
export const db = {
  prepare: (query: string) => {
    console.log("Mock DB prepare (now using API backend):", query);
    return {
      get: (...params: any[]) => {
        console.log("Mock DB get (now using API backend) with params:", params);
        return undefined;
      },
      all: (...params: any[]) => {
        console.log("Mock DB all (now using API backend) with params:", params);
        return [];
      },
      run: (...params: any[]) => {
        console.log("Mock DB run (now using API backend) with params:", params);
        return {};
      }
    };
  },
  exec: (sql: string) => {
    console.log("Mock DB exec (now using API backend):", sql);
  }
};

// For backward compatibility
export const mockDatabase = {
  users: {},
  exams: {},
  questions: {},
  examResults: {}
};
