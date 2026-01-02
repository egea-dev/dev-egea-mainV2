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
  # Add ring to green badges
  sed -i "s/bg-green-50\/50 dark:bg-green-950\/10 text-green-600 dark:text-green-400/bg-green-50\/50 dark:bg-green-950\/10 text-green-600 dark:text-green-400 ring-1 ring-green-500\/20/g" "$file"
  # Add ring to orange badges
  sed -i "s/bg-orange-50\/50 dark:bg-orange-950\/10 text-orange-600 dark:text-orange-400'/bg-orange-50\/50 dark:bg-orange-950\/10 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500\/20'/g" "$file"
  # Add ring to red badges
  sed -i "s/bg-red-50\/50 dark:bg-red-950\/10 text-red-600 dark:text-red-400'/bg-red-50\/50 dark:bg-red-950\/10 text-red-600 dark:text-red-400 ring-1 ring-red-500\/20'/g" "$file"
  # Add ring to blue badges
  sed -i "s/bg-blue-50\/50 dark:bg-blue-950\/10 text-blue-600 dark:text-blue-400'/bg-blue-50\/50 dark:bg-blue-950\/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500\/20'/g" "$file"
  # Add ring to yellow badges
  sed -i "s/bg-yellow-50\/50 dark:bg-yellow-950\/10 text-yellow-600 dark:text-yellow-400'/bg-yellow-50\/50 dark:bg-yellow-950\/10 text-yellow-600 dark:text-yellow-400 ring-1 ring-yellow-500\/20'/g" "$file"
  # Add ring to gray badges
  sed -i "s/bg-gray-50\/50 dark:bg-gray-950\/10 text-gray-600 dark:text-gray-400'/bg-gray-50\/50 dark:bg-gray-950\/10 text-gray-600 dark:text-gray-400 ring-1 ring-gray-500\/20'/g" "$file"
done

echo "Rings added to badges!"
