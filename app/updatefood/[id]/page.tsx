import FoodEntry, { type FoodEntryPageProps } from "@/app/food-entry";

export default async function EditFood({ params, searchParams }: FoodEntryPageProps) {
  const [{ id }, { viewDate }] = await Promise.all([params, searchParams]);
  return <FoodEntry id={id} mode="edit" viewDate={viewDate} key={id} />;
}
