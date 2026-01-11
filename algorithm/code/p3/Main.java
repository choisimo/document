import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.StringTokenizer;

public class Main {

    private static final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
    private static StringTokenizer tokenizer;

    private static String next() throws Exception {
        while (tokenizer == null || !tokenizer.hasMoreTokens()) {
            String line = reader.readLine();
            if (line == null) {
                return null;
            }
            line = line.trim();
            if (line.isEmpty()) {
                continue;
            }
            tokenizer = new StringTokenizer(line);
        }
        return tokenizer.nextToken();
    }

    public static void main(String[] args) throws Exception {
        String token = next();
        if (token == null) return;
        int n = Integer.parseInt(token);

        int tableSize = nextPrime(2 * n);
        Integer[] table = new Integer[tableSize];
        long collisions = 0l;

        for (int i = 0; i < n; i++) {
            int value = Integer.parseInt(next());
            int idx = value % tableSize;
            if (idx < 0) idx += tableSize;

            while (table[idx] != null) {
                collisions++;
                idx = (idx + 1) % tableSize;
            }
            table[idx] = value;
        }

        System.out.print(collisions);
    }


        private static boolean isPrime(int x){
        if (2 > x) return false;
        if (x % 2 == 0) return x == 2;
        for (int i = 3; i * i <= x; i += 2) {
            if (x % i == 0) return false;
        }
        return true;
    }

    private static int nextPrime(int x) {
        if (x <= 2) return 2;
        int candidate = (x % 2 == 0) ? x + 1 : x;
        while (!isPrime(candidate)) {
            candidate += 2;
        }
        return candidate;
    }
}