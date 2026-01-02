#!/bin/bash

# Define los archivos a actualizar
files=(
  "src/components/installations/AllTasksTable.tsx"
  "src/components/installations/DraggableTableRow.tsx"
  "src/components/tasks/TaskDetailsDialog.tsx"
  "src/pages/ArchivePage.tsx"
  "src/pages/SharedPlanPage.tsx"
)

# Actualizar estilos de operarios
for file in "${files[@]}"; do
  sed -i "s/bg-green-500\/70 text-white/bg-green-50 dark:bg-green-950\/30 border border-green-500\/50 text-green-700 dark:text-green-400/g" "$file"
  sed -i "s/bg-orange-500\/70 text-white/bg-orange-50 dark:bg-orange-950\/30 border border-orange-500\/50 text-orange-700 dark:text-orange-400/g" "$file"
  sed -i "s/bg-red-500\/70 text-white/bg-red-50 dark:bg-red-950\/30 border border-red-500\/50 text-red-700 dark:text-red-400/g" "$file"
  sed -i "s/bg-blue-500\/70 text-white/bg-blue-50 dark:bg-blue-950\/30 border border-blue-500\/50 text-blue-700 dark:text-blue-400/g" "$file"
  sed -i "s/bg-yellow-500\/70 text-black/bg-yellow-50 dark:bg-yellow-950\/30 border border-yellow-500\/50 text-yellow-700 dark:text-yellow-400/g" "$file"
  sed -i "s/bg-gray-500\/70 text-white/bg-gray-50 dark:bg-gray-950\/30 border border-gray-500\/50 text-gray-700 dark:text-gray-400/g" "$file"
done

echo "Badges updated successfully!"
