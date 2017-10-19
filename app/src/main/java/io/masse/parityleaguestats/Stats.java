package io.masse.parityleaguestats;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.AsyncTask;
import android.os.Bundle;
import android.view.Gravity;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;
import org.json.JSONArray;

import java.util.ArrayList;
import io.masse.parityleaguestats.customLayout.customLinearLayout;
import io.masse.parityleaguestats.model.Teams;
import io.masse.parityleaguestats.model.Team;
import io.masse.parityleaguestats.tasks.uploadGame;

@SuppressWarnings({"unchecked", "null"})

public class Stats extends Activity {
    //States for each ViewState to be in.
    private static final int autoState = 0;
    private static final int normalState = 1;
    private static final int firstDState = 2;
    private static final int startState = 3;
    private static final int pullState = 4;
    private static final int whoPickedUpDiscState = 5;
    private static final int halfState = 7;
    private static final int firstThrowQuebecVariantState = 8;
    private static final int firstActionState = 9;
    private static final int rosterChangeState = 10;

    //Disc Directions
    private static final boolean left = true;
    private static final boolean right = false;

    //Edit Team and Rosters
    private boolean rosterChange = false;
    private boolean forceRosterChange = true;
    private boolean forceRosterInvert = false;
    private boolean requestUpdateScore = false;
    private boolean requestChangeRoster = false;
    private boolean visibleState[][];

    private customLinearLayout layoutLeft;
    private customLinearLayout layoutRight;
    private Context mainContext;

    private Button btnPull, btnPoint, btnDrop, btnD, btnCatchD,  btnThrowAway, btnUndo, btnMode;
    private TextView leftTeamName, rightTeamName, leftScore, rightScore;

    private Button btnLastButtonClicked;
    private Bookkeeper bookkeeper;

    private View.OnClickListener mainOnClickListener;
    private View.OnClickListener changeModeListener;
    private View.OnClickListener toggleUserListener;

    private final Stats myself = this;

    private Teams teams;
    private Team leftTeam;
    private Team rightTeam;
    private ArrayAdapter<String> gameSummaryAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_stats);
        mainContext = this;

        teams = (Teams)this.getIntent().getSerializableExtra("teams");
        leftTeam = (Team)this.getIntent().getSerializableExtra("leftTeam");
        rightTeam = (Team)this.getIntent().getSerializableExtra("rightTeam");

        // Setup Buttons
        btnPull = (Button) findViewById(R.id.btnPull);
        btnPoint = (Button) findViewById(R.id.btnPoint);
        btnDrop = (Button) findViewById(R.id.btnDrop);
        btnD = (Button) findViewById(R.id.btnD);
        btnCatchD = (Button) findViewById(R.id.btnCatchD);
        btnThrowAway = (Button) findViewById(R.id.btnThrowAway);
        btnUndo = (Button) findViewById(R.id.btnUndo);
        btnMode = (Button) findViewById(R.id.btnMode);

        // Setup TextView
        leftTeamName = (TextView) findViewById(R.id.leftTeam);
        rightTeamName = (TextView) findViewById(R.id.rightTeam);
        leftScore = (TextView) findViewById(R.id.leftScore);
        rightScore = (TextView) findViewById(R.id.rightScore);

        layoutLeft = (customLinearLayout) findViewById(R.id.layoutLeftNames);
        layoutRight = (customLinearLayout) findViewById(R.id.layoutRightNames);

        // undo view
        ListView listView = (ListView) findViewById(R.id.listPlayByPlay);
        gameSummaryAdapter = new ArrayAdapter<>(this, R.layout.game_summary_event_view, R.id.title_text);
        listView.setAdapter(gameSummaryAdapter);

        bookkeeper = new Bookkeeper();
        bookkeeper.startGame();

        mainOnClickListener = new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                btnLastButtonClicked = (Button) view;
                new ButtonPress().execute((Button) view);
            }
        };

        changeModeListener = new View.OnClickListener(){
            @Override
            public void onClick(View view) {
                if (rosterChange){
                    changeState(autoState);
                } else {
                    changeState(rosterChangeState);
                }
            }
        };

        toggleUserListener = new View.OnClickListener(){
            @Override
            public void onClick(View view){
                Button currentButton = (Button) view;
                if (currentButton.getTypeface()!=null) {
                    currentButton.setTypeface(null, Typeface.NORMAL);
                } else {
                    currentButton.setTypeface(null, Typeface.BOLD);
                }
            }
        };

        leftTeamName.setText(leftTeam.name);
        Utils.draw_players(mainContext, layoutLeft, mainOnClickListener, leftTeam, true);

        rightTeamName.setText(rightTeam.name);
        Utils.draw_players(mainContext, layoutRight, mainOnClickListener, rightTeam, false);

        btnUndo.setOnClickListener(mainOnClickListener);
        btnPoint.setOnClickListener(mainOnClickListener);
        btnDrop.setOnClickListener(mainOnClickListener);
        btnPull.setOnClickListener(mainOnClickListener);
        btnD.setOnClickListener(mainOnClickListener);
        btnCatchD.setOnClickListener(mainOnClickListener);
        btnThrowAway.setOnClickListener(mainOnClickListener);
        btnMode.setOnClickListener(changeModeListener);

        changeState(rosterChangeState);
    }

    @Override
    public void onPause(){
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        // Do nothing;
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.main_activity_actions, menu);
        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.action_edit_players:
                Intent intent = new Intent(myself, EditPlayers.class);
                Bundle bundle = new Bundle();
                bundle.putSerializable("teams", teams);
                bundle.putSerializable("leftTeam", leftTeam);
                bundle.putSerializable("rightTeam", rightTeam);
                intent.putExtras(bundle);
                startActivity(intent);
                return true;
            case R.id.action_save_game:
                new AlertDialog.Builder(mainContext)
                        .setTitle("Save and Clear")
                        .setMessage("Are you sure sure?" )
                        .setPositiveButton("Yes", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int whichButton) {
                                bookkeeper.gameCompleted();
                                uploadGame();
                                resetApp();
                            }
                        }).setNeutralButton("Clear", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int whichButton) {
                                bookkeeper.gameCompleted();
                                bookkeeper.backup(); // this is in case someone fat fingers a clear
                                resetApp();
                            }
                        }).setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface dialog, int whichButton) {
                                bookkeeper.backup(); // this is in case someone fat fingers a cancel
                            }
                        }).show();
                return true;
            case R.id.action_half:
                bookkeeper.recordHalf();
                changeState(rosterChangeState);
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    private void resetApp(){
        Intent intent = new Intent(myself, ChooseTeams.class);
        startActivity(intent);
    }

    private void uploadGame() {
        try {
            JSONObject jsonObject = new JSONObject();
            jsonObject.accumulate("league", "ocua_16-17");

            // server will calc the week for now.
            // it would be nice if the client knew what
            // week it was working for though.
            //jsonObject.accumulate("week", 1);

            String strLeftTeamName = leftTeamName.getText().toString();
            String strRightTeamName = rightTeamName.getText().toString();

            Team leftTeam = this.teams.getTeam(strLeftTeamName);
            Team rightTeam = this.teams.getTeam(strRightTeamName);

            // Teams
            JSONObject teams = new JSONObject();
            teams.accumulate(strLeftTeamName, new JSONArray(leftTeam.getPlayers()));
            teams.accumulate(strRightTeamName, new JSONArray(rightTeam.getPlayers()));
            jsonObject.accumulate("teams", teams);

            // Score
            JSONObject score = new JSONObject();
            score.accumulate(strLeftTeamName, leftScore.getText().toString());
            score.accumulate(strRightTeamName, rightScore.getText().toString());
            jsonObject.accumulate("score", score);

            // Points
            JSONArray points = bookkeeper.serialize().getJSONArray("points");
            jsonObject.accumulate("points", points);

            // Upload
            String json = jsonObject.toString();
            new uploadGame(mainContext).execute(json);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private class ButtonPress extends AsyncTask <Button, Button, Long> {

        @SuppressWarnings("ResourceType")
        @Override
        protected Long doInBackground(Button... btns) {

            if (btns.length == 1) {
                Button btn = btns[0];
                String buttonText = btn.getText().toString();
                Boolean leftSideButton = btn.getParent() == layoutLeft;
                Boolean rightSideButton = btn.getParent() == layoutRight;

                if (leftSideButton) {
                    if (bookkeeper.shouldRecordNewPass()) {
                        bookkeeper.recordPass(buttonText);
                    }
                    bookkeeper.recordFirstActor(buttonText, true);

                } else if (rightSideButton) {
                    if (bookkeeper.shouldRecordNewPass()) {
                        bookkeeper.recordPass(buttonText);
                    }
                    bookkeeper.recordFirstActor(buttonText, false);

                } else if ((btn == btnD)) {
                    bookkeeper.recordD();

                } else if ((btn == btnCatchD)){
                    bookkeeper.recordCatchD();

                } else if ((btn == btnDrop)){
                    bookkeeper.recordDrop();

                } else if ((btn == btnPull)){
                    bookkeeper.recordPull();

                } else if ((btn == btnThrowAway)){
                    bookkeeper.recordThrowAway();

                } else if (btn == btnPoint) {
                    bookkeeper.recordPoint();

                    requestUpdateScore = true;
                    requestChangeRoster = true;
                    forceRosterInvert = true;

                } else if (btn == btnUndo){
                    int score = bookkeeper.homeScore + bookkeeper.awayScore;
                    bookkeeper.undo();
                    int newScore = bookkeeper.homeScore + bookkeeper.awayScore;

                    if (score != newScore) {
                        requestUpdateScore = true;
                        forceRosterInvert = true;
                    }
                }

                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (btnLastButtonClicked == btnUndo && rosterChange) {
                            loadButtonVisibility();
                            Toast.makeText(mainContext, "Roster Change OFF and reverted back.", Toast.LENGTH_SHORT).show();
                        }
                        if (requestUpdateScore) {
                            requestUpdateScore = false;
                            leftScore.setText(bookkeeper.homeScore.toString());
                            rightScore.setText(bookkeeper.awayScore.toString());
                        }
                        if (requestChangeRoster) {
                            requestChangeRoster = false;
                            changeState(rosterChangeState);
                        } else {
                            changeState(autoState);
                        }

                        gameSummaryAdapter.clear();
                        gameSummaryAdapter.addAll(bookkeeper.undoHistory());
                        gameSummaryAdapter.notifyDataSetChanged();
                    }
                });
            }
            return null;
        }
    }

    private void changeState(int change) {
        if (change == autoState) {
            change = bookkeeper.uiState();
        }

        toggleRoster(change);
        updateUI(change);
    }

    private void toggleRoster(int change) {
        int leftCount = layoutLeft.getChildCount();
        int rightCount = layoutRight.getChildCount();

        // if rosterChange on turn it off
        if (rosterChange && (change != rosterChangeState)) {
            int leftVisible = 0;
            int rightVisible = 0;

            for (int i = 0; i < leftCount; i++) {
                Button currentButton = (Button) layoutLeft.getChildAt(i);
                if (currentButton.getTypeface() != null)
                    leftVisible++;
            }
            for (int i = 0; i < rightCount; i++) {
                Button currentButton = (Button) layoutRight.getChildAt(i);
                if (currentButton.getTypeface() != null)
                    rightVisible++;
            }

            int teamSize = 6;

            boolean leftCorrectNumPlayers = leftVisible == teamSize;
            boolean rightCorrectNumPlayers = rightVisible == teamSize;

            if (leftCorrectNumPlayers && rightCorrectNumPlayers) {

                rosterChange = false;
                forceRosterChange = false;

                ArrayList<String> leftPlayers = leftTeam.getPlayers();
                ArrayList<String> rightPlayers = rightTeam.getPlayers();

                for (int i = 0; i < leftCount; i++) {
                    Button currentButton = (Button) layoutLeft.getChildAt(i);
                    currentButton.setGravity(Gravity.END);
                    currentButton.setOnClickListener(mainOnClickListener);
                    if (currentButton.getTypeface() != null) {
                        currentButton.setVisibility(View.VISIBLE);
                        String playerName = currentButton.getText().toString();
                        leftPlayers.add(playerName);
                    } else {
                        currentButton.setVisibility(View.INVISIBLE);
                    }
                    currentButton.setTypeface(null, Typeface.NORMAL);
                }
                for (int i = 0; i < rightCount; i++) {
                    Button currentButton = (Button) layoutRight.getChildAt(i);
                    currentButton.setGravity(Gravity.START);
                    currentButton.setOnClickListener(mainOnClickListener);
                    if (currentButton.getTypeface() != null) {
                        currentButton.setVisibility(View.VISIBLE);
                        String playerName = currentButton.getText().toString();
                        rightPlayers.add(playerName);
                    } else {
                        currentButton.setVisibility(View.INVISIBLE);
                    }
                    currentButton.setTypeface(null, Typeface.NORMAL);
                }

                bookkeeper.startPoint(leftTeam.getPlayers(), rightTeam.getPlayers());

                Toast.makeText(mainContext, "Done selecting active players", Toast.LENGTH_SHORT).show();
                btnMode.setText(R.string.mode_button_edit);
            } else {
                String error = "Incorrect number of players";
                if (!leftCorrectNumPlayers) {
                    error += String.format("\nLeft side: %d/%d selected", leftVisible, teamSize);
                }

                if (!rightCorrectNumPlayers) {
                    error += String.format("\nRight side: %d/%d selected", rightVisible, teamSize);
                }

                Toast.makeText(mainContext, error, Toast.LENGTH_LONG).show();
                return;
            }
        }
    }

    private void updateUI(int change) {
        int leftCount = layoutLeft.getChildCount();
        int rightCount = layoutRight.getChildCount();

        switch (change) {
            case normalState:
                btnPoint.setEnabled(true);
                btnDrop.setEnabled(true);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case firstThrowQuebecVariantState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case firstDState:
                btnPoint.setEnabled(true);
                btnDrop.setEnabled(false);
                btnD.setEnabled(true);
                btnCatchD.setEnabled(true);
                btnThrowAway.setEnabled(true);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case firstActionState:
                btnPoint.setEnabled(true);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case startState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnPull.setEnabled(false);
                btnUndo.setEnabled(true);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(true);
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(true);
                }
                break;

            case pullState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(true);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(false);
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(false);
                }
                break;

            case whoPickedUpDiscState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case rosterChangeState:
                rosterChange = true;
                saveButtonVisibility();
                boolean leftAllEnabled = true;
                boolean rightAllEnabled = true;
                for (int i = 0; i < leftCount; i++){
                    Button currentButton = (Button) layoutLeft.getChildAt(i);
                    if (currentButton.getVisibility() != View.VISIBLE)
                        leftAllEnabled = false;
                }
                for (int i = 0; i < rightCount; i++){
                    Button currentButton = (Button) layoutRight.getChildAt(i);
                    if (currentButton.getVisibility() != View.VISIBLE)
                        rightAllEnabled = false;
                }
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnUndo.setEnabled(!forceRosterChange);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);

                int intTypeON = Typeface.BOLD;
                int intTypeOFF = Typeface.NORMAL;

                if (forceRosterInvert) {
                    forceRosterInvert = false;
                    intTypeON = Typeface.NORMAL;
                    intTypeOFF = Typeface.BOLD;
                }
                for (int i = 0; i < leftCount; i++){
                    Button currentButton = (Button) layoutLeft.getChildAt(i);
                    currentButton.setEnabled(true);
                    currentButton.setGravity(Gravity.END);
                    currentButton.setOnClickListener(toggleUserListener);

                    if (currentButton.getVisibility() == View.VISIBLE && !leftAllEnabled){
                        currentButton.setTypeface(null, intTypeON);
                    } else {
                        currentButton.setTypeface(null, intTypeOFF);
                    }

                    currentButton.setVisibility(View.VISIBLE);

                }
                for (int i = 0; i < rightCount; i++){
                    Button currentButton = (Button) layoutRight.getChildAt(i);
                    currentButton.setEnabled(true);
                    currentButton.setGravity(Gravity.START);
                    currentButton.setOnClickListener(toggleUserListener);

                    if (currentButton.getVisibility()== View.VISIBLE && !rightAllEnabled){
                        currentButton.setTypeface(null, intTypeON);
                    } else {
                        currentButton.setTypeface(null, intTypeOFF);
                    }

                    currentButton.setVisibility(View.VISIBLE);
                }

                Toast.makeText(mainContext, "Selecting active players", Toast.LENGTH_SHORT).show();
                btnMode.setText(R.string.mode_button_done);

                break;

            case halfState:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnUndo.setEnabled(true);
                btnPull.setEnabled(false);
                btnMode.setEnabled(true);
                for (int i = 0; i < leftCount; i++){
                    layoutLeft.getChildAt(i).setEnabled(true);
                }
                for (int i = 0; i < rightCount; i++){
                    layoutRight.getChildAt(i).setEnabled(true);
                }
                break;
        }
    }

    private void saveButtonVisibility() {
        int leftCount = layoutLeft.getChildCount();
        int rightCount = layoutRight.getChildCount();

        visibleState = new boolean[2][Math.max(leftCount,rightCount)];

        for (int i = 0; i < leftCount; i++){
            Button currentButton = (Button) layoutLeft.getChildAt(i);
            visibleState[0][i] = (currentButton.getVisibility() == View.VISIBLE);
        }
        for (int i = 0; i < rightCount; i++){
            Button currentButton = (Button) layoutRight.getChildAt(i);
            visibleState[1][i] = (currentButton.getVisibility() == View.VISIBLE);
        }
    }

    private void loadButtonVisibility() {
        int leftCount = layoutLeft.getChildCount();
        int rightCount = layoutRight.getChildCount();
        rosterChange = false;

        for (int i = 0; i < leftCount; i++) {
            Button currentButton = (Button) layoutLeft.getChildAt(i);
            currentButton.setGravity(Gravity.END);
            currentButton.setOnClickListener(mainOnClickListener);
            if (visibleState[0][i]) {
                currentButton.setVisibility(View.VISIBLE);
            } else {
                currentButton.setVisibility(View.INVISIBLE);
            }
            currentButton.setTypeface(null, Typeface.NORMAL);
        }
        for (int i = 0; i < rightCount; i++) {
            Button currentButton = (Button) layoutRight.getChildAt(i);
            currentButton.setGravity(Gravity.START);
            currentButton.setOnClickListener(mainOnClickListener);
            if (visibleState[1][i]) {
                currentButton.setVisibility(View.VISIBLE);
            } else {
                currentButton.setVisibility(View.INVISIBLE);
            }
            currentButton.setTypeface(null, Typeface.NORMAL);
        }
    }
}
