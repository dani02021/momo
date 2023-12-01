package bg.telebidpro.momo;

public class Assert {
    public static void ASSERT(boolean expression, String msg) throws AssertException {
        if( ! expression) {
            throw new AssertException(msg);
        }
    }

    public static class AssertException extends Exception {
        public AssertException(String msg) {
            super(msg);
        }
    }
}
