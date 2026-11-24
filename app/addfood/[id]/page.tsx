import FoodEntry, { type FoodEntryPageProps } from "@/app/food-entry";

export default async function AddFood({ params, searchParams }: FoodEntryPageProps) {
  const [{ id }, { viewDate }] = await Promise.all([params, searchParams]);
  return <FoodEntry id={id} mode="add" viewDate={viewDate} key={id} />;
}
