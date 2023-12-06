package bg.telebidpro.momo;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;

import static bg.telebidpro.momo.error.Assert.AssertException;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.mockito.Mockito.*;

public class BookshelfUnitTest {
    private static Bookshelf bookshelf;
    private static Book book;
    private static Bookshelf bookshelfSpy;

    @Before
    public void setUp() {
        Connection conn = mock();
        bookshelf = new Bookshelf(conn);
        bookshelfSpy = spy(bookshelf);
        book = mock();
    }

    @After
    public void tearDown() {
        reset(bookshelfSpy);
    }

    @Test
    public void testGetBook() throws SQLException, AssertException {
        ArrayList<Book> al = new ArrayList<>();
        al.add(book);

        doReturn(al).when(bookshelfSpy).getBookSequel("Gustavo");

        Book book = bookshelfSpy.getBook("Gustavo");

        doReturn("Gustavo").when(book).getName();

        assertEquals("Does not equal", book.getName(), "Gustavo");
    }

    @Test(expected = AssertException.class)
    public void testGetBookErr() throws SQLException, AssertException {
        ArrayList<Book> al = new ArrayList<>();

        doReturn(al).when(bookshelfSpy).getBookSequel("Gustavo");

        Book book = bookshelfSpy.getBook("Gustavo");
    }

    @Test
    // This test is pretty useless :O
    public void testAddBook() throws SQLException, AssertException {
        doReturn(1).when(bookshelfSpy).addBookSequel(book);

        bookshelfSpy.addBook(book);
    }

    @Test(expected = AssertException.class)
    public void testAddBookErr() throws SQLException, AssertException {
        doReturn(0).when(bookshelfSpy).addBookSequel(book);

        bookshelfSpy.addBook(book);
    }

    @Test
    public void testRemoveBook() throws SQLException, AssertException {
        doReturn(1).when(bookshelfSpy).removeBookSequel("Gustavo");

        bookshelfSpy.removeBook("Gustavo");
    }

    @Test(expected = AssertException.class)
    public void testRemoveBookErr() throws SQLException, AssertException {
        doReturn(0).when(bookshelfSpy).removeBookSequel("Gustavo");

        bookshelfSpy.removeBook("Gustavo");
    }

    @Test
    // Pretty useless
    public void testUpdateBook() throws SQLException, AssertException {
        doReturn(1).when(bookshelfSpy).updateBookSequel("Gustavo", book);

        bookshelfSpy.updateBook("Gustavo", book);
    }

    @Test(expected = AssertException.class)
    public void testUpdateBookErr() throws SQLException, AssertException {
        doReturn(0).when(bookshelfSpy).updateBookSequel("Gustavo", book);

        bookshelfSpy.updateBook("Gustavo", book);
    }

    @Test
    // Pretty useless
    public void testListBooks() throws SQLException, AssertException {
        Book book1 = mock();

        ArrayList<Book> al = new ArrayList<>();
        al.add(book);
        al.add(book1);
        doReturn(al).when(bookshelfSpy).listBooksSequel();

        bookshelfSpy.listBooks();
    }

    @Test
    public void testParseTemplate() throws SQLException, AssertException {
        String template = "This book is ##book## and this author is ##author##";

        doReturn("Momo").when(book).getName();
        doReturn("Sancho").when(book).getAuthor();
        String parsedTemplate = bookshelfSpy.parseTemplate(template, book);

        assertFalse("Template contains ##book##", parsedTemplate.contains("##book##"));
        assertFalse("Template contains ##author##", parsedTemplate.contains("##author##"));
    }
}
