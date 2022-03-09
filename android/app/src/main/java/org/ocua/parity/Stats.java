package org.ocua.parity;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.HashSet;

import org.ocua.parity.customLayout.CustomLinearLayout;
import org.ocua.parity.model.League;
import org.ocua.parity.model.Team;
import org.ocua.parity.model.Teams;

public class Stats extends Activity {
    private CustomLinearLayout layoutLeft;
    private CustomLinearLayout layoutRight;
    private ListView undoHistory;
    private Context context;

    private Button btnPull, btnPoint, btnDrop, btnD, btnCatchD,  btnThrowAway, btnUndo, btnMode;
    private TextView leftTeamName, rightTeamName, leftScore, rightScore;

    private View.OnClickListener mainOnClickListener;
    private View.OnClickListener changeModeListener;

    private League league;
    private Teams teams;
    private Bookkeeper bookkeeper;

    private Team leftTeam;
    private Team rightTeam;
    ArrayList<String> leftPlayers;
    ArrayList<String> rightPlayers;

    private ArrayAdapter<String> gameSummaryAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_stats);
        context = this;

        loadIntent();
        renderGameBar();
        initUndoView();
        createListeners();
        renderPlayers();
        setupButtons();

        updateUI();
    }

    private void loadIntent() {
        Intent intent = this.getIntent();
        league = (League) intent.getSerializableExtra("league");
        teams = (Teams) intent.getSerializableExtra("teams");
        bookkeeper = (Bookkeeper) intent.getSerializableExtra("bookkeeper");
        leftTeam = bookkeeper.homeTeam;
        rightTeam = bookkeeper.awayTeam;

        leftPlayers = (ArrayList<String>) intent.getSerializableExtra("leftPlayers");
        rightPlayers = (ArrayList<String>) intent.getSerializableExtra("rightPlayers");
    }

    private void renderGameBar() {
        leftTeamName = (TextView) findViewById(R.id.leftTeam);
        rightTeamName = (TextView) findViewById(R.id.rightTeam);

        leftTeamName.setText(bookkeeper.homeTeam.name);
        rightTeamName.setText(bookkeeper.awayTeam.name);

        leftScore = (TextView) findViewById(R.id.leftScore);
        rightScore = (TextView) findViewById(R.id.rightScore);

        leftScore.setText(bookkeeper.homeScore.toString());
        rightScore.setText(bookkeeper.awayScore.toString());
    }

    private void initUndoView() {
        undoHistory = (ListView) findViewById(R.id.listPlayByPlay);
        gameSummaryAdapter = new ArrayAdapter<>(this, R.layout.game_summary_event_view, R.id.title_text);
        undoHistory.setAdapter(gameSummaryAdapter);
    }

    private void createListeners() {
        mainOnClickListener = new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Button btn = (Button)view;
                String buttonText = btn.getText().toString();
                Boolean leftSideButton = btn.getParent() == layoutLeft;
                Boolean rightSideButton = btn.getParent() == layoutRight;

                if (leftSideButton) {
                    if (bookkeeper.shouldRecordNewPass()) {
                        bookkeeper.recordPass(buttonText);
                    } else {
                        bookkeeper.recordFirstActor(buttonText, true);
                    }

                } else if (rightSideButton) {
                    if (bookkeeper.shouldRecordNewPass()) {
                        bookkeeper.recordPass(buttonText);
                    } else {
                        bookkeeper.recordFirstActor(buttonText, false);
                    }

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
                    selectPlayers(true);

                } else if (btn == btnUndo) {
                    if (bookkeeper.activePoint == null) {
                        selectPlayers();
                    } else {
                        bookkeeper.undo();
                    }
                }

                updateUI();
            }
        };

        changeModeListener = new View.OnClickListener(){
            @Override
            public void onClick(View view) {
                selectPlayers();
            }
        };
    }

    private void renderPlayers() {
        layoutLeft = (CustomLinearLayout) findViewById(R.id.layoutLeftNames);
        layoutRight = (CustomLinearLayout) findViewById(R.id.layoutRightNames);

        leftTeamName.setText(leftTeam.name);
        Utils.draw_players(context, layoutLeft, mainOnClickListener, leftTeam, true);
        Utils.show_players(layoutLeft, leftPlayers);

        rightTeamName.setText(rightTeam.name);
        Utils.draw_players(context, layoutRight, mainOnClickListener, rightTeam, false);
        Utils.show_players(layoutRight, rightPlayers);
    }

    private void setupButtons() {
        btnPull = (Button) findViewById(R.id.btnPull);
        btnPoint = (Button) findViewById(R.id.btnPoint);
        btnDrop = (Button) findViewById(R.id.btnDrop);
        btnD = (Button) findViewById(R.id.btnD);
        btnCatchD = (Button) findViewById(R.id.btnCatchD);
        btnThrowAway = (Button) findViewById(R.id.btnThrowAway);
        btnUndo = (Button) findViewById(R.id.btnUndo);
        btnMode = (Button) findViewById(R.id.btnMode);

        btnUndo.setOnClickListener(mainOnClickListener);
        btnPoint.setOnClickListener(mainOnClickListener);
        btnDrop.setOnClickListener(mainOnClickListener);
        btnPull.setOnClickListener(mainOnClickListener);
        btnD.setOnClickListener(mainOnClickListener);
        btnCatchD.setOnClickListener(mainOnClickListener);
        btnThrowAway.setOnClickListener(mainOnClickListener);
        btnMode.setOnClickListener(changeModeListener);
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
        inflater.inflate(R.menu.menu_stats, menu);
        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.action_edit_players:
                editRosters();
                return true;
            case R.id.action_record_half:
                bookkeeper.recordHalf();
                Toast.makeText(context, "Half Recorded", Toast.LENGTH_LONG).show();
                return true;
            case R.id.action_save_game:
                submitGame();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    private void editRosters() {
        Intent intent = new Intent(this, EditRosters.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("league", league);
        bundle.putSerializable("teams", teams);
        bundle.putSerializable("bookkeeper", bookkeeper);
        bundle.putStringArrayList("leftPlayers", leftPlayers);
        bundle.putStringArrayList("rightPlayers", rightPlayers);
        intent.putExtras(bundle);
        intent.setFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        startActivity(intent);
    }

    private void submitGame() {
        Intent intent = new Intent(this, SubmitGame.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("bookkeeper", bookkeeper);
        intent.putExtras(bundle);
        startActivity(intent);
    }

    private void selectPlayers() {
        selectPlayers(false);
    }

    private void selectPlayers(Boolean flipPlayers) {
        Intent intent = new Intent(context, SelectPlayers.class);
        Bundle bundle = new Bundle();
        bundle.putSerializable("league", league);
        bundle.putSerializable("teams", teams);
        bundle.putSerializable("bookkeeper", bookkeeper);
        if (flipPlayers) {
            HashSet<String> newLeftPlayers = new HashSet<>(leftTeam.getRoster());
            newLeftPlayers.removeAll(leftPlayers);
            bundle.putStringArrayList("leftPlayers", new ArrayList<>(newLeftPlayers));

            HashSet<String> newRightPlayers = new HashSet<>(rightTeam.getRoster());
            newRightPlayers.removeAll(rightPlayers);
            bundle.putStringArrayList("rightPlayers", new ArrayList<>(newRightPlayers));
        } else {
            bundle.putStringArrayList("leftPlayers", leftPlayers);
            bundle.putStringArrayList("rightPlayers", rightPlayers);
        }
        intent.putExtras(bundle);
        intent.setFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        startActivity(intent);
    }

    private void updateUI() {
        gameSummaryAdapter.clear();
        gameSummaryAdapter.addAll(bookkeeper.undoHistory());
        gameSummaryAdapter.notifyDataSetChanged();
        undoHistory.setSelection(gameSummaryAdapter.getCount() - 1);

        int state = bookkeeper.gameState();
        int leftCount = layoutLeft.getChildCount();
        int rightCount = layoutRight.getChildCount();

        switch (state) {
            case GameState.Normal:
                btnPoint.setEnabled(true);
                btnDrop.setEnabled(true);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnPull.setEnabled(false);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case GameState.FirstThrowQuebecVariant:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnPull.setEnabled(false);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case GameState.FirstD:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(true);
                btnCatchD.setEnabled(true);
                btnThrowAway.setEnabled(true);
                btnPull.setEnabled(false);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case GameState.Start:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnPull.setEnabled(false);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(true);
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(true);
                }
                break;

            case GameState.Pull:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnPull.setEnabled(true);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(false);
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(false);
                }
                break;

            case GameState.WhoPickedUpDisc:
                btnPoint.setEnabled(false);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(false);
                btnPull.setEnabled(false);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;

            case GameState.SecondD:
                btnPoint.setEnabled(true);
                btnDrop.setEnabled(false);
                btnD.setEnabled(false);
                btnCatchD.setEnabled(false);
                btnThrowAway.setEnabled(true);
                btnPull.setEnabled(false);

                for (int i = 0; i < leftCount; i++) {
                    layoutLeft.getChildAt(i).setEnabled(bookkeeper.homePossession);
                    if (((Button) layoutLeft.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutLeft.getChildAt(i).setEnabled(false);
                    }
                }
                for (int i = 0; i < rightCount; i++) {
                    layoutRight.getChildAt(i).setEnabled(!bookkeeper.homePossession);
                    if (((Button) layoutRight.getChildAt(i)).getText().toString() == bookkeeper.firstActor) {
                        layoutRight.getChildAt(i).setEnabled(false);
                    }
                }
                break;
        }
    }
}
