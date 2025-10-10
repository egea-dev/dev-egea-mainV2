#!/bin/bash

files=(
  "src/pages/Installations.tsx"
  "src/components/installations/AllTasksTable.tsx"
  "src/components/installations/DraggableTableRow.tsx"
  "src/components/tasks/TaskDetailsDialog.tsx"
  "src/pages/ArchivePage.tsx"
  "src/pages/SharedPlanPage.tsx"
)

for file in "${files[@]}"; do
  # Remove borders and make backgrounds very subtle
  sed -i "s/bg-green-50 dark:bg-green-950\/30 border border-green-500\/50 text-green-700 dark:text-green-400/bg-green-50\/50 dark:bg-green-950\/10 text-green-600 dark:text-green-400/g" "$file"
  sed -i "s/bg-orange-50 dark:bg-orange-950\/30 border border-orange-500\/50 text-orange-700 dark:text-orange-400/bg-orange-50\/50 dark:bg-orange-950\/10 text-orange-600 dark:text-orange-400/g" "$file"
  sed -i "s/bg-red-50 dark:bg-red-950\/30 border border-red-500\/50 text-red-700 dark:text-red-400/bg-red-50\/50 dark:bg-red-950\/10 text-red-600 dark:text-red-400/g" "$file"
  sed -i "s/bg-blue-50 dark:bg-blue-950\/30 border border-blue-500\/50 text-blue-700 dark:text-blue-400/bg-blue-50\/50 dark:bg-blue-950\/10 text-blue-600 dark:text-blue-400/g" "$file"
  sed -i "s/bg-yellow-50 dark:bg-yellow-950\/30 border border-yellow-500\/50 text-yellow-700 dark:text-yellow-400/bg-yellow-50\/50 dark:bg-yellow-950\/10 text-yellow-600 dark:text-yellow-400/g" "$file"
  sed -i "s/bg-gray-50 dark:bg-gray-950\/30 border border-gray-500\/50 text-gray-700 dark:text-gray-400/bg-gray-50\/50 dark:bg-gray-950\/10 text-gray-600 dark:text-gray-400/g" "$file"
  
  # Update padding and remove font-medium
  sed -i "s/px-2 py-1 rounded-md text-sm font-medium/px-3 py-1.5 rounded-md text-sm/g" "$file"
  sed -i "s/px-3 py-2 rounded-md text-sm font-medium/px-3 py-1.5 rounded-md text-sm/g" "$file"
done

echo "Updated to subtle style!"
