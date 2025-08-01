// Placeholder ID type until Supabase types are defined
export type Id<T extends string> = string;

// Placeholder Doc type
export type Doc<T extends string> = {
  _id: Id<T>;
  _creationTime?: number;
};