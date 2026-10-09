#include <stdio.h>
#define MAX 10
#define INF 9999

int graph[MAX][MAX];
int n;

void displayGraph()
{
    int i, j;
    printf("\nRoad Network:\n");
    for (i = 0; i < n; i++)
    {
        for (j = 0; j < n; j++)
        {
            if (graph[i][j] == INF)
                printf("INF ");
            else
                printf("%3d ", graph[i][j]);
        }
        printf("\n");
    }
}

void dijkstra(int source, int destination)
{
    int distance[MAX];
    int visited[MAX];
    int parent[MAX];
    int i, j, min, u;

    for (i = 0; i < n; i++)
    {
        distance[i] = INF;
        visited[i] = 0;
        parent[i] = -1;
    }

    distance[source] = 0;

    for (i = 0; i < n; i++)
    {
        min = INF;
        u = -1;
        for (j = 0; j < n; j++)
        {
            if (!visited[j] && distance[j] < min)
            {
                min = distance[j];
                u = j;
            }
        }
        if (u == -1)
            break;

        visited[u] = 1;

        for (j = 0; j < n; j++)
        {
            if (!visited[j] &&
                graph[u][j] != INF &&
                distance[u] + graph[u][j] < distance[j])
            {
                distance[j] = distance[u] + graph[u][j];
                parent[j] = u;
            }
        }
    }

    if (distance[destination] == INF)
    {
        printf("\nNo rescue route available.\n");
        return;
    }

    printf("\nShortest Rescue Route: ");
    int path[MAX];
    int count = 0;
    int current = destination;
    while (current != -1)
    {
        path[count++] = current;
        current = parent[current];
    }

    for (i = count - 1; i >= 0; i--)
    {
        printf("L%d", path[i]);
        if (i != 0)
            printf(" -> ");
    }
    printf("\nMinimum Distance = %d km\n", distance[destination]);
}

int main()
{
    int i, j;
    int source, destination;

    printf("============================================\n");
    printf(" SMART EMERGENCY EVACUATION & RESCUE SYSTEM\n");
    printf("============================================\n");

    printf("\nEnter number of locations: ");
    if (scanf("%d", &n) != 1) return 1;

    printf("\nEnter distance between locations\n");
    printf("(Enter 0 if there is no direct road)\n\n");

    for (i = 0; i < n; i++)
    {
        for (j = 0; j < n; j++)
        {
            if (i == j)
            {
                graph[i][j] = 0;
            }
            else
            {
                int distance;
                printf("Distance L%d -> L%d: ", i, j);
                if (scanf("%d", &distance) != 1) return 1;
                if (distance == 0)
                    graph[i][j] = INF;
                else
                    graph[i][j] = distance;
            }
        }
    }

    displayGraph();

    printf("\nEnter emergency location (0 to %d): ", n - 1);
    if (scanf("%d", &source) != 1) return 1;

    printf("Enter rescue center (0 to %d): ", n - 1);
    if (scanf("%d", &destination) != 1) return 1;

    dijkstra(source, destination);

    printf("\n============================================\n");
    printf(" EVACUATION ANALYSIS COMPLETE\n");
    printf("============================================\n");

    return 0;
}
