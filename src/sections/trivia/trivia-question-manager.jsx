import React, { useState, useCallback, useEffect } from 'react';

// MUI Material components - Sorted by string length, then alphabetically for same length
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { styled } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import EditIcon from '@mui/icons-material/Edit';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardHeader from '@mui/material/CardHeader';
import DeleteIcon from '@mui/icons-material/Delete';
import FormControl from '@mui/material/FormControl';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { supabase } from 'src/lib/supabase'; // Assuming this path is correct

const StyledTabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(5),
  },
}));

// Function to safely render TabPanel content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <StyledTabPanel>{children}</StyledTabPanel>}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export function TriviaQuestionManager() {
  // State for tab management
  const [currentTab, setCurrentTab] = useState(0); // 0 for Create New, 1 for Manage Existing

  // State for Create New Question form
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']); // Array for 4 choices
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [category, setCategory] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState(1); // Default to 1 (e.g., Easy)
  const [gameContext, setGameContext] = useState('Knowledge Ascent');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // State for Manage Existing Questions
  const [questions, setQuestions] = useState([]);
  const [fetchingQuestions, setFetchingQuestions] = useState(true);
  const [fetchError, setFetchError] = useState(null); // This is the state variable for errors during fetching

  // State for Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5); // You can adjust this default

  // State for Editing
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editOptions, setEditOptions] = useState(['', '', '', '']);
  const [editCorrectAnswer, setEditCorrectAnswer] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDifficultyLevel, setEditDifficultyLevel] = useState(1);
  const [editGameContext, setEditGameContext] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  // Handle Tab Change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    if (newValue === 1) {
      // If switching to "Manage Existing" tab, fetch questions
      fetchTriviaQuestions();
    }
  };

  // --- Create New Question Handlers ---
  const handleOptionChange = useCallback(
    (index, value) => {
      const newOptions = [...options];
      newOptions[index] = value;
      setOptions(newOptions);
    },
    [options]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Basic validation
    if (!questionText || options.some((opt) => !opt) || !correctAnswer || !category) {
      setError(
        'Please fill in all required fields (Question, all Choices, Correct Answer, Category).'
      );
      setLoading(false);
      return;
    }
    if (!options.includes(correctAnswer)) {
      setError('Correct Answer must be one of the provided choices.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: insertError } = await supabase.from('trivia_questions').insert([
        {
          question_text: questionText,
          options: options,
          correct_answer: correctAnswer,
          category: category,
          difficulty_level: difficultyLevel,
          game_context: gameContext,
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);
      // Clear form after successful submission
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectAnswer('');
      setCategory('');
      setDifficultyLevel(1);
      // gameContext typically remains 'Knowledge Ascent'
    } catch (err) {
      console.error('Error adding question:', err);
      setError(err.message || 'Failed to add question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Manage Existing Questions Handlers ---
  const fetchTriviaQuestions = async () => {
    setFetchingQuestions(true);
    setFetchError(null);
    try {
      // Renamed 'error: fetchError' to 'error: supabaseFetchError' to avoid shadowing
      const { data, error: supabaseFetchError } = await supabase
        .from('trivia_questions')
        .select('*')
        .order('created_at', { ascending: false }); // Order by creation date, newest first

      if (supabaseFetchError) {
        // Use the new name here
        throw supabaseFetchError;
      }
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setFetchError(err.message || 'Failed to fetch questions. Please try again.');
    } finally {
      setFetchingQuestions(false);
    }
  };

  // Initial fetch when component mounts (or when tab switches to manage)
  useEffect(() => {
    if (currentTab === 1) {
      // Only fetch if 'Manage Existing' tab is active
      fetchTriviaQuestions();
    }
  }, [currentTab]); // Re-fetch when tab changes

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }
    setLoading(true); // Using global loading for now, consider separate state if needed
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('trivia_questions').delete().eq('id', id); // Assuming 'id' is your primary key

      if (deleteError) {
        throw deleteError;
      }

      setQuestions((prev) => prev.filter((q) => q.id !== id));
      // Optionally show a success message here or just rely on the item disappearing
    } catch (err) {
      console.error('Error deleting question:', err);
      setError(err.message || 'Failed to delete question.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (question) => {
    setEditingQuestion(question);
    setEditQuestionText(question.question_text);
    setEditOptions(question.options);
    setEditCorrectAnswer(question.correct_answer);
    setEditCategory(question.category);
    setEditDifficultyLevel(question.difficulty_level);
    setEditGameContext(question.game_context);
    setEditError(null); // Clear previous edit errors
    setOpenEditDialog(true);
  };

  const handleEditOptionChange = useCallback(
    (index, value) => {
      const newOptions = [...editOptions];
      newOptions[index] = value;
      setEditOptions(newOptions);
    },
    [editOptions]
  );

  const handleSaveEdit = async () => {
    setEditLoading(true);
    setEditError(null);

    if (
      !editQuestionText ||
      editOptions.some((opt) => !opt) ||
      !editCorrectAnswer ||
      !editCategory
    ) {
      setEditError(
        'Please fill in all required fields (Question, all Choices, Correct Answer, Category).'
      );
      setEditLoading(false);
      return;
    }
    if (!editOptions.includes(editCorrectAnswer)) {
      setEditError('Correct Answer must be one of the provided choices.');
      setEditLoading(false);
      return;
    }

    try {
      const { data, error: updateError } = await supabase
        .from('trivia_questions')
        .update({
          question_text: editQuestionText,
          options: editOptions,
          correct_answer: editCorrectAnswer,
          category: editCategory,
          difficulty_level: editDifficultyLevel,
          game_context: editGameContext,
        })
        .eq('id', editingQuestion.id);

      if (updateError) {
        throw updateError;
      }

      // Update the questions state with the edited item
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === editingQuestion.id
            ? {
                ...q,
                ...editingQuestion,
                question_text: editQuestionText,
                options: editOptions,
                correct_answer: editCorrectAnswer,
                category: editCategory,
                difficulty_level: editDifficultyLevel,
                game_context: editGameContext,
              }
            : q
        )
      );
      setOpenEditDialog(false);
      setEditingQuestion(null);
    } catch (err) {
      console.error('Error updating question:', err);
      setEditError(err.message || 'Failed to update question. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  // Pagination Handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const emptyRows = rowsPerPage - Math.min(rowsPerPage, questions.length - page * rowsPerPage);

  return (
    <Card>
      <CardHeader title="Trivia Question Manager" />
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="trivia manager tabs">
          <Tab label="Create New Question" {...a11yProps(0)} />
          <Tab label="Manage Existing Questions" {...a11yProps(1)} />
        </Tabs>
      </Box>

      {/* Tab Panel for Create New Question */}
      <TabPanel value={currentTab} index={0}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">Question added successfully!</Alert>}

            <TextField
              label="Question Text"
              multiline
              rows={4}
              fullWidth
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              required
            />

            <Typography variant="h6" sx={{ mt: 2 }}>
              Choices (Provide 4 options)
            </Typography>
            {options.map((option, index) => (
              <TextField
                key={index}
                label={`Option ${index + 1}`}
                fullWidth
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                required
              />
            ))}

            <FormControl fullWidth required>
              <InputLabel id="correct-answer-label">Correct Answer</InputLabel>
              <Select
                labelId="correct-answer-label"
                label="Correct Answer"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select Correct Answer</em>
                </MenuItem>
                {options
                  .filter((opt) => opt)
                  .map((opt, index) => (
                    <MenuItem key={index} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              label="Category"
              fullWidth
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Marketing, Sales, Technology"
              required
            />

            <FormControl fullWidth>
              <InputLabel id="difficulty-label">Difficulty Level</InputLabel>
              <Select
                labelId="difficulty-label"
                label="Difficulty Level"
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <MenuItem key={level} value={level}>
                    {level} {level === 1 ? '(Easy)' : level === 5 ? '(Hard)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Game Context"
              fullWidth
              value={gameContext}
              onChange={(e) => setGameContext(e.target.value)}
              helperText="Default is 'Knowledge Ascent'. Change only if this question is for a different game."
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
              sx={{ mt: 3 }}
            >
              {loading ? 'Adding Question...' : 'Add Question'}
            </Button>
          </Stack>
        </form>
      </TabPanel>

      {/* Tab Panel for Manage Existing Questions */}
      <TabPanel value={currentTab} index={1}>
        <Stack spacing={3}>
          <Button variant="contained" onClick={fetchTriviaQuestions} disabled={fetchingQuestions}>
            {fetchingQuestions ? <CircularProgress size={20} /> : 'Refresh Questions'}
          </Button>

          {fetchError && <Alert severity="error">{fetchError}</Alert>}
          {fetchingQuestions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : questions.length === 0 ? (
            <Alert severity="info">No trivia questions found.</Alert>
          ) : (
            <Paper>
              <TableContainer>
                <Table sx={{ minWidth: 650 }} aria-label="trivia questions table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Question</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Difficulty</TableCell>
                      <TableCell>Correct Answer</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(rowsPerPage > 0
                      ? questions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      : questions
                    ).map((question) => (
                      <TableRow key={question.id}>
                        <TableCell component="th" scope="row">
                          {question.question_text}
                        </TableCell>
                        <TableCell>{question.category}</TableCell>
                        <TableCell>{question.difficulty_level}</TableCell>
                        <TableCell>{question.correct_answer}</TableCell>
                        <TableCell align="right">
                          <IconButton onClick={() => handleEditClick(question)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDelete(question.id)} disabled={loading}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {emptyRows > 0 && (
                      <TableRow style={{ height: 53 * emptyRows }}>
                        <TableCell colSpan={6} />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={questions.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          )}
        </Stack>
      </TabPanel>

      {/* Edit Question Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Trivia Question</DialogTitle>
        <DialogContent dividers>
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editError}
            </Alert>
          )}
          {editingQuestion && (
            <Stack spacing={2}>
              <TextField
                label="Question Text"
                multiline
                rows={4}
                fullWidth
                value={editQuestionText}
                onChange={(e) => setEditQuestionText(e.target.value)}
                required
              />
              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Choices (Provide 4 options)
              </Typography>
              {editOptions.map((option, index) => (
                <TextField
                  key={index}
                  label={`Option ${index + 1}`}
                  fullWidth
                  value={option}
                  onChange={(e) => handleEditOptionChange(index, e.target.value)}
                  required
                />
              ))}
              <FormControl fullWidth required>
                <InputLabel id="edit-correct-answer-label">Correct Answer</InputLabel>
                <Select
                  labelId="edit-correct-answer-label"
                  label="Correct Answer"
                  value={editCorrectAnswer}
                  onChange={(e) => setEditCorrectAnswer(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select Correct Answer</em>
                  </MenuItem>
                  {editOptions
                    .filter((opt) => opt)
                    .map((opt, index) => (
                      <MenuItem key={index} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <TextField
                label="Category"
                fullWidth
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                required
              />
              <FormControl fullWidth>
                <InputLabel id="edit-difficulty-label">Difficulty Level</InputLabel>
                <Select
                  labelId="edit-difficulty-label"
                  label="Difficulty Level"
                  value={editDifficultyLevel}
                  onChange={(e) => setEditDifficultyLevel(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <MenuItem key={level} value={level}>
                      {level} {level === 1 ? '(Easy)' : level === 5 ? '(Hard)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Game Context"
                fullWidth
                value={editGameContext}
                onChange={(e) => setEditGameContext(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={editLoading}>
            {editLoading ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
