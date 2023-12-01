package bg.telebidpro.momo;

import org.junit.Test;
import static bg.telebidpro.momo.Assert.*;

public class AssertTest {
    @Test
    public void testAssert() throws Assert.AssertException {
        ASSERT(true, "Should not throw");
    }

    @Test(expected = AssertException.class)
    public void testAssertError() throws Assert.AssertException {
        ASSERT(false, "Should throw");
    }
}
